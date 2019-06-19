import DS from 'ember-data';

const { Model, attr, belongsTo } = DS;
import { computed } from '@ember/object';

export default class UserModel extends Model {
  @attr('string') firstName;
  @attr('string') lastName;
  @attr('string') username;
  @attr('string') email;

  @belongsTo('department', { async: false })
  department;

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

}
