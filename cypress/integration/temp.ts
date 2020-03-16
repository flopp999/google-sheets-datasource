/// <reference path="../../node_modules/@grafana/e2e/cypress/support/index.d.ts" />
import { e2e } from '@grafana/e2e';

export interface AddDataSourceConfig {
  expectedAlertMessage: string;
  form: Function;
  name: string;
};

export interface AddPanelConfig {
  dataSourceName: string;
  queriesForm: Function;
};

export interface Context {
  lastAddedDashboard: string;
  lastAddedDashboardUid: string;
  lastAddedDataSource: string;
  lastAddedDataSourceId: string;
  [key: string]: any;
};

// @todo remove when @grafana/e2e's `afterEach` uses `setContext`
const CONTEXT_KEYS = [
  'lastAddedDashboard',
  'lastAddedDashboardUid',
  'lastAddedDataSource',
  'lastAddedDataSourceId',
];

const DEFAULT_DATA_SOURCE_CONFIG: AddDataSourceConfig = {
  expectedAlertMessage: 'Data source is working',
  form: () => {},
  name: 'TestData DB',
};

const DEFAULT_PANEL_CONFIG: AddPanelConfig = {
  dataSourceName: 'TestData DB',
  queriesForm: () => {},
};

export const addDashboard = () => {
  e2e().logToConsole('Adding dashboard');
  e2e.pages.AddDashboard.visit();

  const dashboardTitle = e2e.flows.saveNewDashboard();
  e2e().logToConsole('Added dashboard with title:', dashboardTitle);

  e2e()
    .url()
    .then((url: string) => setContext({
      lastAddedDashboard: dashboardTitle,
      lastAddedDashboardUid: getDashboardUid(url),
    }));
};

// @todo remove when possible
export const addDataSource = (config?: Partial<AddDataSourceConfig>): string => {
  const { expectedAlertMessage, form, name } = { ...DEFAULT_DATA_SOURCE_CONFIG, ...config };

  e2e().logToConsole('Adding data source with name:', name);
  e2e.pages.AddDataSource.visit();
  e2e.pages.AddDataSource.dataSourcePlugins(name)
    .scrollIntoView()
    .should('be.visible') // prevents flakiness
    .click();

  const dataSourceName = `e2e-${Date.now()}`;
  e2e.pages.DataSource.name().clear();
  e2e.pages.DataSource.name().type(dataSourceName);
  form();
  e2e.pages.DataSource.saveAndTest().click();
  e2e.pages.DataSource.alert().should('exist');
  e2e.pages.DataSource.alertMessage().should('contain.text', expectedAlertMessage);
  e2e().logToConsole('Added data source with name:', dataSourceName);

  e2e()
    .url()
    .then((url: string) => {
      const dataSourceId = getDataSourceId(url);

      setContext({
        lastAddedDataSource: dataSourceName,
        lastAddedDataSourceId: dataSourceId,
      });

      const healthUrl = fromBaseUrl(`/api/datasources/${dataSourceId}/health`);
      e2e().logToConsole(`Fetching ${healthUrl}`);
      e2e()
        .request(healthUrl)
        .its('body')
        .should('have.property', 'status')
        .and('eq', 'OK');
    });

  return dataSourceName;
};

export const addPanel = (config?: Partial<AddPanelConfig>) => {
  const { dataSourceName, queriesForm } = { ...DEFAULT_PANEL_CONFIG, ...config };

  getContext().then(({ lastAddedDashboardUid }) => {
    e2e.flows.openDashboard(lastAddedDashboardUid);
    e2e.pages.Dashboard.Toolbar.toolbarItems('Add panel').click();
    e2e.pages.AddDashboard.ctaButtons('Add Query').click();
    e2e()
      .get('.ds-picker')
      .click()
      .contains(dataSourceName)
      .click();
    queriesForm();
  });
};

// @todo use `Url.fromBaseUrl` when possible
const fromBaseUrl = (url: string): string => {
  const baseUrl = (e2e.env('BASE_URL') || e2e.config().baseUrl || 'http://localhost:3000').replace('^/', '');
  return `${baseUrl}${url}`;
};

// @ts-ignore
export const getByAriaLabel = (label: string) => e2e().get(`[aria-label="${label}"]`);

const getContext = (): Cypress.Chainable => e2e()
  .wrap({
    getContext: () => Object.fromEntries(
      CONTEXT_KEYS.map(key => [key, e2e.context().get(key)])
    ) as Context
  })
  .invoke('getContext');

// @todo use `Url.getDashboardUid` when possible
const getDashboardUid = (url: string): string => {
  const matches = url.match(/\/d\/(.*)\//);
  if (!matches) {
    throw new Error(`Couldn't parse uid from ${url}`);
  }

  return matches[1];
};

// @todo use `Url.getDataSourceId` when possible
const getDataSourceId = (url: string): string => {
  const matches = url.match(/\/edit\/(.*)\//);
  if (!matches) {
    throw new Error(`Couldn't parse id from ${url}`);
  }

  return matches[1];
};

// @ts-ignore
export const getByPlaceholder = (placeholder: string) => e2e().get(`[placeholder="${placeholder}"]`);

const setContext = (newContext: Partial<Context>): Cypress.Chainable => e2e()
  .wrap({
    setContext: (newContext: any) => {
      Object.entries(newContext).forEach(([key, value]) => {
        e2e.context().set(key, value);
      });
    }
  })
  .invoke('setContext', newContext);
