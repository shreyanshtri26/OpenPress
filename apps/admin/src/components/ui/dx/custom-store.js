// Minimal stand-in for devextreme/data/custom_store: the kit DataGrid calls load() and accepts an array or { data }.
export default class CustomStore {
  constructor(options = {}) {
    Object.assign(this, options);
  }
}
