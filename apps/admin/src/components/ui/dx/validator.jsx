// Declarative validation markers. They render nothing; the parent editor reads their props (see _shared.jsx).
export function Validator() {
  return null;
}
Validator.isDxValidator = true;

export function RequiredRule() {
  return null;
}
RequiredRule.ruleType = 'required';

export function PatternRule() {
  return null;
}
PatternRule.ruleType = 'pattern';

export function StringLengthRule() {
  return null;
}
StringLengthRule.ruleType = 'stringLength';

export default Validator;
