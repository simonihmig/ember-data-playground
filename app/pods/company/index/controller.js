import Controller from '@ember/controller';
import { readOnly } from '@ember/object/computed';
import { action } from '@ember/object';

export default class CompanyIndexController extends Controller {
  @readOnly('model') companies;

  @action
  delete(company) {
    return company.destroyRecord();
  }
}
