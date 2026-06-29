export interface WorkbenchPatchPaths {
    readonly htmlFile: string;
    readonly scriptFile: string;
    readonly styleFile: string;
}

export interface WorkbenchPatchStatus {
    readonly enabled: boolean;
    readonly paths: WorkbenchPatchPaths | null;
}
