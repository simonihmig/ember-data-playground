import DS from 'ember-data';
const { Model, attr, hasMany } = DS;

export default class CompanyModel extends Model {
  @attr('string') name;

  @hasMany('department', { cascadeSave: true, async: false })
  departments;
}
