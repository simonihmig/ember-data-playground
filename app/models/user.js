import DS from 'ember-data';

const { Model, attr, belongsTo } = DS;
import { computed } from '@ember/object';

export default class UserModel extends Model {
  @belongsTo('department', { async: false }) department;
  @attr('string') firstName;
  @attr('string') lastName;
  @attr('string') username;
  @attr('string') email;

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

}
