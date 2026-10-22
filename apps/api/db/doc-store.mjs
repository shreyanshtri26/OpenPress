// A document store backed by Postgres (table `documents`, one jsonb row per item).
// Route handlers keep calling docClient.send(new PutCommand(...)) etc.; this implements the commands and
// expression syntax they use: Put/Get/Update/Delete/Scan/Query, Condition/Filter/KeyCondition/Update/Projection
// expressions with attribute_exists, attribute_not_exists, begins_with, contains, size, if_not_exists, list_append,
// arithmetic, ADD, REMOVE, comparisons, BETWEEN, IN, AND/OR/NOT, Limit + ExclusiveStartKey paging.
// ponytail: Scan/Query load the table's rows and filter in JS — fine for CMS-sized tables; add SQL filters if a table gets big.
import { getClient } from './client.mjs';

// client.mjs's `sql` export is a method-only proxy; tagged-template queries need the real client.
const pg = () => getClient().sql;
import { keySchemaFor } from './doc-tables.mjs';

// ---------------- expression parsing ----------------
const TOKEN = /\s*(?:(#[\w]+)|(:[\w]+)|([A-Za-z_][\w]*)|(<>|<=|>=|=|<|>)|([(),.[\]+-])|(\d+))/y;

function tokenize(src) {
  const tokens = [];
  TOKEN.lastIndex = 0;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) throw new Error(`Cannot parse expression near "${src.slice(pos, pos + 20)}"`);
    pos = TOKEN.lastIndex;
    if (m[1]) tokens.push({ t: 'name', v: m[1] });
    else if (m[2]) tokens.push({ t: 'value', v: m[2] });
    else if (m[3]) tokens.push({ t: 'word', v: m[3] });
    else if (m[4]) tokens.push({ t: 'op', v: m[4] });
    else if (m[5]) tokens.push({ t: 'punct', v: m[5] });
    else tokens.push({ t: 'num', v: Number(m[6]) });
  }
  return tokens;
}

function parser(src, names = {}, values = {}) {
  const tokens = tokenize(src);
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const isWord = (w) => peek()?.t === 'word' && peek().v.toUpperCase() === w;
  const expect = (v) => {
    const tok = next();
    if (!tok || tok.v !== v) throw new Error(`Expected "${v}" in expression "${src}"`);
  };
  const nameOf = (tok) => {
    if (tok.t === 'name') {
      if (!(tok.v in names)) throw new Error(`Missing ExpressionAttributeNames entry ${tok.v}`);
      return names[tok.v];
    }
    return tok.v;
  };

  // path := name ('.' name | '[' n ']')*   -> array of segments
  const path = () => {
    const segs = [nameOf(next())];
    while (peek() && (peek().v === '.' || peek().v === '[')) {
      if (next().v === '.') segs.push(nameOf(next()));
      else { segs.push(next().v); expect(']'); }
    }
    return segs;
  };

  // operand := :value | path | size(path) | if_not_exists(path, operand) | list_append(a, b)   (+/- operand)*
  const operandBase = () => {
    const tok = peek();
    if (tok.t === 'value') {
      next();
      if (!(tok.v in values)) throw new Error(`Missing ExpressionAttributeValues entry ${tok.v}`);
      const v = values[tok.v];
      return () => v;
    }
    if (tok.t === 'word' && tokens[i + 1]?.v === '(') {
      const fn = next().v.toLowerCase();
      expect('(');
      if (fn === 'size') { const p = path(); expect(')'); return (item) => sizeOf(get(item, p)); }
      if (fn === 'if_not_exists') {
        const p = path(); expect(','); const alt = operand(); expect(')');
        return (item) => (get(item, p) === undefined ? alt(item) : get(item, p));
      }
      if (fn === 'list_append') {
        const a = operand(); expect(','); const b = operand(); expect(')');
        return (item) => [...toList(a(item)), ...toList(b(item))];
      }
      throw new Error(`Unsupported function ${fn} in "${src}"`);
    }
    const p = path();
    return (item) => get(item, p);
  };
  const operand = () => {
    let left = operandBase();
    while (peek()?.v === '+' || peek()?.v === '-') {
      const op = next().v;
      const right = operandBase();
      const l = left;
      left = (item) => (op === '+' ? Number(l(item)) + Number(right(item)) : Number(l(item)) - Number(right(item)));
    }
    return left;
  };

  // condition grammar
  const primary = () => {
    if (peek()?.v === '(') { next(); const c = orExpr(); expect(')'); return c; }
    const tok = peek();
    if (tok.t === 'word' && tokens[i + 1]?.v === '(') {
      const fn = tok.v.toLowerCase();
      if (fn === 'attribute_exists' || fn === 'attribute_not_exists') {
        next(); expect('('); const p = path(); expect(')');
        return fn === 'attribute_exists' ? (item) => get(item, p) !== undefined : (item) => get(item, p) === undefined;
      }
      if (fn === 'begins_with' || fn === 'contains') {
        next(); expect('('); const a = operand(); expect(','); const b = operand(); expect(')');
        if (fn === 'begins_with') return (item) => typeof a(item) === 'string' && a(item).startsWith(b(item));
        return (item) => {
          const hay = a(item);
          const needle = b(item);
          if (typeof hay === 'string') return typeof needle === 'string' && hay.includes(needle);
          return Array.isArray(hay) && hay.some((x) => equal(x, needle));
        };
      }
    }
    const left = operand();
    if (isWord('BETWEEN')) {
      next(); const lo = operand(); if (!isWord('AND')) throw new Error('BETWEEN needs AND'); next(); const hi = operand();
      return (item) => compare(left(item), lo(item)) >= 0 && compare(left(item), hi(item)) <= 0;
    }
    if (isWord('IN')) {
      next(); expect('(');
      const list = [operand()];
      while (peek()?.v === ',') { next(); list.push(operand()); }
      expect(')');
      return (item) => list.some((o) => equal(left(item), o(item)));
    }
    const op = next();
    if (op?.t !== 'op') throw new Error(`Expected comparison in "${src}"`);
    const right = operand();
    return (item) => {
      const l = left(item);
      const r = right(item);
      if (op.v === '=') return equal(l, r);
      if (op.v === '<>') return !equal(l, r);
      if (l === undefined || r === undefined) return false;
      const c = compare(l, r);
      return op.v === '<' ? c < 0 : op.v === '<=' ? c <= 0 : op.v === '>' ? c > 0 : c >= 0;
    };
  };
  const notExpr = () => (isWord('NOT') ? (next(), ((c) => (item) => !c(item))(notExpr())) : primary());
  const andExpr = () => {
    let left = notExpr();
    while (isWord('AND')) { next(); const r = notExpr(); const l = left; left = (item) => l(item) && r(item); }
    return left;
  };
  const orExpr = () => {
    let left = andExpr();
    while (isWord('OR')) { next(); const r = andExpr(); const l = left; left = (item) => l(item) || r(item); }
    return left;
  };

  const condition = () => {
    const c = orExpr();
    if (i < tokens.length) throw new Error(`Unexpected "${peek().v}" in "${src}"`);
    return c;
  };

  // update := (SET a = op, ... | REMOVE p, ... | ADD p :v, ... | DELETE p :v, ...)+
  const update = () => {
    const actions = [];
    while (i < tokens.length) {
      const clause = next().v.toUpperCase();
      do {
        if (peek()?.v === ',') next();
        if (clause === 'SET') { const p = path(); expect('='); const v = operand(); actions.push({ kind: 'set', p, v }); }
        else if (clause === 'REMOVE') actions.push({ kind: 'remove', p: path() });
        else if (clause === 'ADD' || clause === 'DELETE') { const p = path(); const v = operand(); actions.push({ kind: clause.toLowerCase(), p, v }); }
        else throw new Error(`Unsupported update clause ${clause}`);
      } while (peek()?.v === ',');
    }
    return actions;
  };

  const projection = () => {
    const paths = [path()];
    while (peek()?.v === ',') { next(); paths.push(path()); }
    return paths;
  };

  return { condition, update, projection };
}

// ---------------- value helpers ----------------
const toList = (v) => (v instanceof Set ? [...v] : Array.isArray(v) ? v : v === undefined ? [] : [v]);
const sizeOf = (v) => (typeof v === 'string' || Array.isArray(v) ? v.length : v instanceof Set ? v.size : v && typeof v === 'object' ? Object.keys(v).length : 0);
const equal = (a, b) => (a !== null && typeof a === 'object' ? JSON.stringify(a) === JSON.stringify(b) : a === b);
const compare = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);

function get(item, segs) {
  let cur = item;
  for (const s of segs) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[s];
  }
  return cur;
}

function set(item, segs, value) {
  let cur = item;
  segs.slice(0, -1).forEach((s, idx) => {
    if (cur[s] === null || typeof cur[s] !== 'object') cur[s] = typeof segs[idx + 1] === 'number' ? [] : {};
    cur = cur[s];
  });
  cur[segs.at(-1)] = value;
}

function remove(item, segs) {
  const parent = get(item, segs.slice(0, -1));
  if (parent && typeof parent === 'object') {
    if (Array.isArray(parent)) parent.splice(segs.at(-1), 1);
    else delete parent[segs.at(-1)];
  }
}

// JSON cannot hold Sets (Sets are stored as arrays); store them as arrays.
const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (x instanceof Set ? [...x] : x === undefined ? null : x)));

function conditionFailed() {
  const err = new Error('The conditional request failed');
  err.name = 'ConditionCheckFailed';
  return err;
}

function project(item, expr, names) {
  if (!expr || !item) return item;
  const out = {};
  for (const p of parser(expr, names).projection()) {
    const v = get(item, p);
    if (v !== undefined) set(out, p, structuredClone(v));
  }
  return out;
}

// ---------------- the store ----------------
export function createDocStore() {
  const keyOf = (table, item) => {
    const def = keySchemaFor(table);
    const key = { [def.hash]: item[def.hash] };
    if (def.range) key[def.range] = item[def.range];
    for (const [k, v] of Object.entries(key)) if (v === undefined || v === null) throw new Error(`Missing key attribute "${k}" for table ${table}`);
    return key;
  };
  const pkOf = (table, item) => JSON.stringify(Object.entries(keyOf(table, item)).sort(([a], [b]) => a.localeCompare(b)));

  const load = async (table, pk, tx = pg()) => (await tx`SELECT item FROM documents WHERE table_name = ${table} AND pk = ${pk}`)[0]?.item;
  const save = (table, pk, item, tx = pg()) => tx`
    INSERT INTO documents (table_name, pk, item, updated_at) VALUES (${table}, ${pk}, ${JSON.stringify(plain(item))}::jsonb, now())
    ON CONFLICT (table_name, pk) DO UPDATE SET item = EXCLUDED.item, updated_at = now()`;
  const check = (input, existing) => {
    if (!input.ConditionExpression) return;
    const ok = parser(input.ConditionExpression, input.ExpressionAttributeNames, input.ExpressionAttributeValues).condition()(existing || {});
    if (!ok) throw conditionFailed();
  };

  const commands = {
    async PutCommand(input) {
      const pk = pkOf(input.TableName, input.Item);
      return pg().begin(async (tx) => {
        const existing = await load(input.TableName, pk, tx);
        check(input, existing);
        await save(input.TableName, pk, input.Item, tx);
        return input.ReturnValues === 'ALL_OLD' && existing ? { Attributes: existing } : {};
      });
    },

    async GetCommand(input) {
      const item = await load(input.TableName, pkOf(input.TableName, input.Key));
      return item ? { Item: project(item, input.ProjectionExpression, input.ExpressionAttributeNames) } : {};
    },

    async UpdateCommand(input) {
      const pk = pkOf(input.TableName, input.Key);
      return pg().begin(async (tx) => {
        const existing = (await tx`SELECT item FROM documents WHERE table_name = ${input.TableName} AND pk = ${pk} FOR UPDATE`)[0]?.item;
        check(input, existing);
        const item = structuredClone(existing || { ...input.Key });
        const before = structuredClone(item);
        const actions = input.UpdateExpression ? parser(input.UpdateExpression, input.ExpressionAttributeNames, input.ExpressionAttributeValues).update() : [];
        // Every right-hand side is evaluated against the item as it was before the update.
        const resolved = actions.map((a) => ({ ...a, value: a.v ? a.v(before) : undefined }));
        const touched = new Set();
        for (const a of resolved) {
          touched.add(a.p[0]);
          if (a.kind === 'set') set(item, a.p, structuredClone(a.value));
          else if (a.kind === 'remove') remove(item, a.p);
          else if (a.kind === 'add') {
            const cur = get(item, a.p);
            if (typeof a.value === 'number') set(item, a.p, (Number(cur) || 0) + a.value);
            else set(item, a.p, [...new Set([...toList(cur), ...toList(a.value)])]);
          } else if (a.kind === 'delete') {
            const drop = toList(a.value);
            set(item, a.p, toList(get(item, a.p)).filter((x) => !drop.some((d) => equal(d, x))));
          }
        }
        await save(input.TableName, pk, item, tx);
        const rv = input.ReturnValues;
        if (rv === 'ALL_NEW') return { Attributes: plain(item) };
        if (rv === 'ALL_OLD') return existing ? { Attributes: existing } : {};
        if (rv === 'UPDATED_NEW' || rv === 'UPDATED_OLD') {
          const src = rv === 'UPDATED_NEW' ? plain(item) : before;
          return { Attributes: Object.fromEntries([...touched].filter((k) => src[k] !== undefined).map((k) => [k, src[k]])) };
        }
        return {};
      });
    },

    async DeleteCommand(input) {
      const pk = pkOf(input.TableName, input.Key);
      return pg().begin(async (tx) => {
        const existing = await load(input.TableName, pk, tx);
        check(input, existing);
        await tx`DELETE FROM documents WHERE table_name = ${input.TableName} AND pk = ${pk}`;
        return input.ReturnValues === 'ALL_OLD' && existing ? { Attributes: existing } : {};
      });
    },

    async ScanCommand(input) {
      const startAfter = input.ExclusiveStartKey ? pkOf(input.TableName, input.ExclusiveStartKey) : null;
      const rows = startAfter
        ? await pg()`SELECT pk, item FROM documents WHERE table_name = ${input.TableName} AND pk > ${startAfter} ORDER BY pk`
        : await pg()`SELECT pk, item FROM documents WHERE table_name = ${input.TableName} ORDER BY pk`;
      return page(input, rows.map((r) => r.item), rows.length);
    },

    async QueryCommand(input) {
      const def = keySchemaFor(input.TableName);
      const index = input.IndexName ? def.gsis?.find((g) => g.name === input.IndexName) : null;
      if (input.IndexName && !index) throw new Error(`Unknown index ${input.IndexName} on ${input.TableName}`);
      const rangeKey = index ? index.range : def.range;
      const rows = await pg()`SELECT item FROM documents WHERE table_name = ${input.TableName}`;
      const keyCond = parser(input.KeyConditionExpression, input.ExpressionAttributeNames, input.ExpressionAttributeValues).condition();
      let items = rows.map((r) => r.item).filter(keyCond);
      if (rangeKey) items.sort((a, b) => compare(a[rangeKey], b[rangeKey]) * (input.ScanIndexForward === false ? -1 : 1));
      if (input.ExclusiveStartKey) {
        const at = items.findIndex((it) => pkOf(input.TableName, it) === pkOf(input.TableName, input.ExclusiveStartKey));
        items = at >= 0 ? items.slice(at + 1) : items;
      }
      return page(input, items, items.length);
    },
  };

  // Limit applies before the filter (scan semantics); LastEvaluatedKey marks where to resume.
  function page(input, items, available) {
    const limited = input.Limit ? items.slice(0, input.Limit) : items;
    const filter = input.FilterExpression ? parser(input.FilterExpression, input.ExpressionAttributeNames, input.ExpressionAttributeValues).condition() : null;
    const matched = filter ? limited.filter(filter) : limited;
    const out = {
      Items: matched.map((it) => project(it, input.ProjectionExpression, input.ExpressionAttributeNames)),
      Count: matched.length,
      ScannedCount: limited.length,
    };
    if (input.Select === 'COUNT') delete out.Items;
    if (input.Limit && available > input.Limit && limited.length) out.LastEvaluatedKey = keyOf(input.TableName, limited.at(-1));
    return out;
  }

  return {
    async send(command) {
      const run = commands[command?.type];
      if (!run) throw new Error(`Postgres document store does not support ${command?.type}`);
      return run(command.input);
    },
  };
}

export default createDocStore;
