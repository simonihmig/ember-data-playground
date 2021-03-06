import Controller from '@ember/controller';
import { readOnly } from '@ember/object/computed';
import { action } from '@ember/object';

export default class CompanyEditController extends Controller {
  @readOnly('model') company;

  @action
  async save(props) {
    this.company.setProperties(props);
    try {
      await this.company.save();
      alert('saving was successfull!')
    }
    catch (e) {
      alert(`An error occurred: ${e.message}`);
    }
  }

  @action
  async delete() {
    await this.company.destroyRecord();
    return this.transitionToRoute('company.index');
  }

  @action
  addDepartment() {
    let newDepartment = this.store.createRecord('department');
    this.company.departments.pushObject(newDepartment);
  }
}
