import DS from 'ember-data';
const { Model, attr, belongsTo, hasMany } = DS;

export default class DepartmentModel extends Model {
  @attr('string') name;

  @belongsTo('company', { async: false }) company;

  @hasMany('users', { cascadeSave: true, async: false })
  users;
}
