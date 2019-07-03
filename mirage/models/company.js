import { Model, hasMany } from 'ember-cli-mirage';

export default Model.extend({
  departments: hasMany('department', {inverse: 'company'}),
  users: hasMany('user', {inverse: 'company'})
});
