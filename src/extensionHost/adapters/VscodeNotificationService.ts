export const WORKBENCH_RELOAD_COMMAND = "workbench.action.reloadWindow";

export interface NotificationAction {
  readonly title: string;
}

export interface NeonNotificationService {
  requestWorkbenchReload(message: string, actionTitle: string): Promise<void>;
  showErrorMessage(message: string): Promise<void>;
  showInformationMessage(message: string): Promise<void>;
}

export interface VscodeNotificationApi {
  readonly commands: {
    executeCommand(command: string): Thenable<unknown>;
  };
  readonly window: {
    showErrorMessage(message: string): Thenable<unknown>;
    showInformationMessage(message: string, item?: NotificationAction): Thenable<unknown>;
  };
}

export function createVscodeNotificationService(vscodeApi: VscodeNotificationApi): NeonNotificationService {
  return new VscodeNotificationService(vscodeApi);
}

class VscodeNotificationService implements NeonNotificationService {
  constructor(private readonly vscodeApi: VscodeNotificationApi) {}

  async requestWorkbenchReload(message: string, actionTitle: string): Promise<void> {
    await this.vscodeApi.window.showInformationMessage(message, { title: actionTitle });
    await this.vscodeApi.commands.executeCommand(WORKBENCH_RELOAD_COMMAND);
  }

  async showErrorMessage(message: string): Promise<void> {
    await this.vscodeApi.window.showErrorMessage(message);
  }

  async showInformationMessage(message: string): Promise<void> {
    await this.vscodeApi.window.showInformationMessage(message);
  }
}
