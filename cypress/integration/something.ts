/// <reference path="../../node_modules/@grafana/e2e/cypress/support/index.d.ts" />
import { addDataSource, addPanel, getByPlaceholder } from './temp';
import { e2e } from '@grafana/e2e';

const addGoogleSheetsDataSource = (apiKey: string) => {
  const fillApiKey = () => getByPlaceholder('Enter API Key').scrollIntoView().type(apiKey);

  // This get auto-removed within `afterEach` of @grafana/e2e
  addDataSource({
    expectedAlertMessage: 'Success',
    form: () => fillApiKey(),
    name: 'Google Sheets',
  });
};

const addGoogleSheetsPanel = (spreadsheetId: string) => {
  const fillSpreadsheetID = () => {
    e2e().contains('.gf-form', 'Enter SpreadsheetID').click();
    e2e()
      .contains('.gf-form-input', 'Choose')
      .find('.gf-form-select-box__input input')
      .scrollIntoView()
      .type(spreadsheetId);
  };

  // This get auto-removed within `afterEach` of @grafana/e2e
  addPanel({
    dataSourceName: 'Google Sheets',
    queriesForm: () => fillSpreadsheetID(),
  });
};

e2e.scenario({
  describeName: 'Smoke tests',
  itName: 'Login, create data source, dashboard and panel',
  scenario: () => {
    // Paths are relative to <project-root>/provisioning
    const provisionPaths = [
      'google-sheets-datasource-API-key.yml',
      'google-sheets-datasource-jwt.yml',
    ];

    e2e().readProvisions(provisionPaths).then(([apiKeyProvision, jwtProvision]) => {
      addGoogleSheetsDataSource(apiKeyProvision.datasources[0].secureJsonData.apiKey);
      e2e.flows.addDashboard();
      addGoogleSheetsPanel('1Kn_9WKsuT-H0aJL3fvqukt27HlizMLd-KQfkNgeWj4U');
    });
  },
});
