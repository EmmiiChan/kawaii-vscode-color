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
    executeCommand(command: string): PromiseLike<unknown>;
  };
  readonly window: {
    showErrorMessage(message: string): PromiseLike<unknown>;
    showInformationMessage(message: string, item?: NotificationAction): PromiseLike<unknown>;
  };
}

export function createVscodeNotificationService(vscodeApi: VscodeNotificationApi): NeonNotificationService {
  return new VscodeNotificationService(vscodeApi);
}

class VscodeNotificationService implements NeonNotificationService {
  constructor(private readonly vscodeApi: VscodeNotificationApi) {}

  async requestWorkbenchReload(message: string, actionTitle: string): Promise<void> {
    const selection = this.vscodeApi.window.showInformationMessage(message, { title: actionTitle });

    void Promise.resolve(selection).then((selectedAction) => {
      if (isNotificationActionSelection(selectedAction, actionTitle)) {
        return this.vscodeApi.commands.executeCommand(WORKBENCH_RELOAD_COMMAND);
      }

      return undefined;
    }).catch(() => undefined);
  }

  async showErrorMessage(message: string): Promise<void> {
    await this.vscodeApi.window.showErrorMessage(message);
  }

  async showInformationMessage(message: string): Promise<void> {
    await this.vscodeApi.window.showInformationMessage(message);
  }
}

function isNotificationActionSelection(selection: unknown, actionTitle: string): selection is NotificationAction {
  return typeof selection === "object"
    && selection !== null
    && "title" in selection
    && selection.title === actionTitle;
}
