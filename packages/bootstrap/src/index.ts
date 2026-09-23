export { BOOTSTRAP_PACKAGE_NAME, FOUNDATION_VERSION } from "./identity.js";
export type {
  InstallOptions,
  InstallResult,
  InstallationContext,
  SelfUpdateResult,
  UninstallOptions,
  UninstallResult,
  UninstallTargetResult,
  UninstallTargetStatus,
} from "./lifecycle.js";
export {
  install,
  installedContext,
  installedVersion,
  selfUpdate,
  uninstall,
} from "./lifecycle.js";
export {
  TEST_PAUSE_AFTER_PREPARED_VARIABLE,
  TEST_ROOT_MARKER,
  TEST_USER_HOME_VARIABLE,
} from "./lifecycle.js";
export type {
  AutomaticUpdateOperation,
  DoctorMode,
  DoctorOptions,
  DoctorResult,
  PostOperationUpdateOptions,
  PostOperationUpdateResult,
} from "./maintenance.js";
export { doctor, runPostOperationUpdateDiscovery } from "./maintenance.js";
export type { HelpOptions, HelpResult } from "./help.js";
export { help } from "./help.js";
