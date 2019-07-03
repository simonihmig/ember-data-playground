import DS from 'ember-data';
const { Model, attr, belongsTo, hasMany } = DS;

export default class DepartmentModel extends Model {
  @attr('string') name;

  @belongsTo('company', { async: false, inverse: 'departments' })
  company;

  @hasMany('users', { cascadeSave: true, async: false, inverse: 'department' })
  users;
}
