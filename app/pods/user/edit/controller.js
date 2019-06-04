import Controller from '@ember/controller';
import { readOnly } from '@ember/object/computed';
import { action } from '@ember/object';

export default class UserEditController extends Controller {
  @readOnly('model') user;

  @action
  async save(props) {
    this.user.setProperties(props);
    await this.user.save();
    return this.transitionToRoute('user.index');
  }

}
