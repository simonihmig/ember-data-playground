import DS from 'ember-data';
const { Model, attr, belongsTo } = DS;

export default class UserModel extends Model {
  @belongsTo('department') department;
  @attr('string') firstName;
  @attr('string') lastName;
  @attr('string') username;
  @attr('string') email;
}
