// kit-style <Chart>/<PieChart> markup rendered with Recharts (MIT).
// Children (<Series>, <ValueAxis>, <Label>, ...) are configuration markers that render nothing.
import { Children, isValidElement } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend as RLegend, LabelList, PieChart as RPieChart, Pie, Cell,
} from 'recharts';
import { toArray } from './_shared';

const marker = (role) => {
  /** @param {Record<string, any>} _props */
  const Marker = (_props) => null;
  Marker.dxRole = role;
  Marker.displayName = role;
  return Marker;
};

export const Series = marker('Series');
export const ArgumentAxis = marker('ArgumentAxis');
export const ValueAxis = marker('ValueAxis');
export const Legend = marker('Legend');
export const Tooltip = marker('Tooltip');
export const Label = marker('Label');
export const Grid = marker('Grid');
export const Margin = marker('Margin');
export const Animation = marker('Animation');
export const Connector = marker('Connector');

const DEFAULT_PALETTE = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#475569'];

const kids = (children) => Children.toArray(children).filter(isValidElement);
const find = (children, role) => kids(children).find((c) => c.type?.dxRole === role);

function parseProps(props) {
  const palette = Array.isArray(props.palette) && props.palette.length ? props.palette : DEFAULT_PALETTE;
  const series = [];
  const valueAxes = [];
  let argumentAxis = {};
  let legend = {};
  let tooltip = {};
  let margin = {};
  for (const child of kids(props.children)) {
    const role = child.type?.dxRole;
    const { children, ...p } = child.props;
    if (role === 'Series') {
      const label = find(children, 'Label');
      series.push({
        ...p,
        color: p.color ?? palette[series.length % palette.length],
        label: label ? { ...label.props, connector: find(label.props.children, 'Connector')?.props } : null,
      });
    } else if (role === 'ValueAxis') {
      valueAxes.push({ ...p, grid: find(children, 'Grid')?.props, label: find(children, 'Label')?.props });
    } else if (role === 'ArgumentAxis') argumentAxis = { ...p, grid: find(children, 'Grid')?.props };
    else if (role === 'Legend') legend = p;
    else if (role === 'Tooltip') tooltip = p;
    else if (role === 'Margin') margin = p;
  }
  return {
    series, valueAxes, argumentAxis, legend, tooltip, margin, palette,
    rotated: Boolean(props.rotated),
    argumentField: series[0]?.argumentField ?? 'arg',
  };
}

export const parseChart = (element) => parseProps(element.props);

// the grid kit tooltips return small HTML strings ("<b>x</b><br/>y"); keep the line breaks and bold, drop all other markup.
export function tooltipLines(text) {
  return String(text ?? '')
    .split(/<br\s*\/?>/i)
    .map((seg) => ({ text: seg.replace(/<[^>]*>/g, '').trim(), bold: /<b>/i.test(seg) }))
    .filter((line) => line.text);
}

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString() : String(v ?? ''));

function TooltipBox({ lines }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      {lines.map((line, i) => (
        <div key={i} className={line.bold ? 'font-semibold text-gray-900' : 'text-gray-700'}>{line.text}</div>
      ))}
    </div>
  );
}

function renderTooltip(spec, total) {
  return function DxTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const first = payload[0];
    const argument = label ?? first.payload?.[spec.argumentField] ?? first.name;
    if (spec.tooltip.customizeTooltip) {
      const value = first.value;
      const percent = total ? value / total : undefined;
      const result = spec.tooltip.customizeTooltip({
        argument, argumentText: fmt(argument), value, valueText: fmt(value), seriesName: first.name,
        percent, percentText: percent !== undefined ? `${(percent * 100).toFixed(1)}%` : '', point: { data: first.payload },
      });
      return <TooltipBox lines={tooltipLines(result?.text ?? result?.html ?? '')} />;
    }
    return <TooltipBox lines={[{ text: fmt(argument), bold: true }, ...payload.map((p) => ({ text: `${p.name}: ${fmt(p.value)}`, bold: false }))]} />;
  };
}

function legendProps(legend) {
  return {
    verticalAlign: legend.verticalAlignment === 'top' ? 'top' : 'bottom',
    align: legend.horizontalAlignment === 'left' ? 'left' : legend.horizontalAlignment === 'right' ? 'right' : 'center',
    wrapperStyle: { fontSize: 12 },
  };
}

function barLabel(series, data, argumentField, rotated) {
  const custom = series.label?.customizeText;
  return (
    <LabelList
      dataKey={series.valueField}
      position={rotated ? 'right' : 'top'}
      style={{ fontSize: 11, fill: '#374151' }}
      formatter={custom ? undefined : fmt}
      content={custom ? ({ x, y, width, height, value, index }) => {
        const text = custom({ value, valueText: fmt(value), argument: data[index]?.[argumentField], argumentText: fmt(data[index]?.[argumentField]) });
        const tx = rotated ? x + width + 6 : x + width / 2;
        const ty = rotated ? y + height / 2 : y - 6;
        return <text x={tx} y={ty} fontSize={11} fill="#374151" textAnchor={rotated ? 'start' : 'middle'} dominantBaseline={rotated ? 'middle' : 'auto'}>{text}</text>;
      } : undefined}
    />
  );
}

export function Chart(props) {
  const spec = parseProps(props);
  const data = toArray(props.dataSource);
  const { rotated, argumentField: arg } = spec;
  const named = spec.valueAxes.filter((a) => a.name);
  const axisIds = named.length > 1 ? named.map((a) => a.name) : ['v'];
  const primary = spec.valueAxes[0] || {};
  const showGrid = primary.grid?.visible !== false;
  const tickFormatter = typeof primary.label?.format === 'function' ? primary.label.format : undefined;

  return (
    <div id={props.id} className={props.className} style={{ width: '100%', height: props.height ?? 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} layout={rotated ? 'vertical' : 'horizontal'} margin={{ top: 16, right: 24, bottom: spec.margin.bottom ?? 8, left: 8 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={!rotated} vertical={rotated} />}
          {rotated ? (
            <>
              <XAxis type="number" allowDecimals={primary.allowDecimals !== false} tickFormatter={tickFormatter} tick={{ fontSize: 11 }} hide={primary.visible === false} />
              <YAxis type="category" dataKey={arg} width={120} tick={{ fontSize: 11 }} hide={spec.argumentAxis.visible === false} />
            </>
          ) : (
            <>
              <XAxis dataKey={arg} tick={{ fontSize: 11 }} hide={spec.argumentAxis.visible === false} />
              {axisIds.map((id, i) => {
                const axis = named.length > 1 ? named[i] : primary;
                return (
                  <YAxis
                    key={id}
                    yAxisId={id}
                    orientation={axis.position === 'right' ? 'right' : 'left'}
                    allowDecimals={axis.allowDecimals !== false}
                    tickFormatter={tickFormatter}
                    tick={{ fontSize: 11 }}
                    hide={axis.visible === false}
                    label={axis.title ? { value: axis.title, angle: -90, position: 'insideRight', fontSize: 11 } : undefined}
                  />
                );
              })}
            </>
          )}
          {spec.tooltip.enabled !== false && <RTooltip content={renderTooltip(spec)} />}
          {spec.legend.visible !== false && spec.series.length > 1 && <RLegend {...legendProps(spec.legend)} />}
          {spec.series.map((s, i) => {
            const common = { key: `${s.valueField}-${i}`, dataKey: s.valueField, name: s.name ?? s.valueField, isAnimationActive: true };
            const yAxisId = rotated ? undefined : named.length > 1 ? (s.axis ?? named[0].name) : 'v';
            const type = String(s.type || 'bar').toLowerCase();
            if (type.includes('area')) {
              return <Area {...common} yAxisId={yAxisId} type={type.startsWith('spline') ? 'monotone' : 'linear'} stroke={s.color} fill={s.color} fillOpacity={s.opacity ?? 0.2} strokeWidth={s.width ?? 2} />;
            }
            if (type === 'line' || type === 'spline' || type === 'stepline') {
              return <Line {...common} yAxisId={yAxisId} type={type === 'spline' ? 'monotone' : type === 'stepline' ? 'step' : 'linear'} stroke={s.color} strokeWidth={s.width ?? 2} dot={false} />;
            }
            const r = s.cornerRadius ?? 0;
            return (
              <Bar {...common} yAxisId={yAxisId} fill={s.color} stackId={type.startsWith('stacked') ? 'stack' : undefined} radius={rotated ? [0, r, r, 0] : [r, r, 0, 0]} maxBarSize={48}>
                {s.label?.visible && barLabel(s, data, arg, rotated)}
              </Bar>
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PieChart(props) {
  const spec = parseProps(props);
  const data = toArray(props.dataSource);
  const s = spec.series[0] || {};
  const arg = s.argumentField ?? 'arg';
  const val = s.valueField ?? 'val';
  const total = data.reduce((sum, d) => sum + (Number(d[val]) || 0), 0);
  const custom = s.label?.customizeText;
  const label = s.label?.visible
    ? (p) => (custom
      ? custom({ value: p.value, valueText: fmt(p.value), argument: p.payload?.[arg], argumentText: fmt(p.payload?.[arg]), percent: p.percent, percentText: `${((p.percent ?? 0) * 100).toFixed(1)}%` })
      : fmt(p.value))
    : false;

  return (
    <div id={props.id} className={props.className} style={{ width: '100%', height: props.height ?? 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RPieChart>
          <Pie
            data={data}
            dataKey={val}
            nameKey={arg}
            innerRadius={props.type === 'doughnut' || props.type === 'donut' ? '50%' : 0}
            outerRadius="72%"
            label={label}
            labelLine={s.label?.visible ? s.label?.connector?.visible !== false : false}
            isAnimationActive
          >
            {data.map((_, i) => <Cell key={i} fill={spec.palette[i % spec.palette.length]} />)}
          </Pie>
          {spec.tooltip.enabled !== false && <RTooltip content={renderTooltip({ ...spec, argumentField: arg }, total)} />}
          {spec.legend.visible !== false && <RLegend {...legendProps(spec.legend)} />}
        </RPieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Chart;
