import {
  DEFAULT_REMOTE_THEMES_URL,
  updateThemeColorPacksFromGitHub
} from "./build-color-theme";

interface CliOptions {
  readonly dryRun: boolean;
  readonly githubThemesUrl: string;
}

function parseCliOptions(argv: readonly string[]): CliOptions {
  const positionalArguments: string[] = [];
  let dryRun = false;

  argv.forEach((argument) => {
    if (argument === "--dry-run") {
      dryRun = true;
      return;
    }

    if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    }

    positionalArguments.push(argument);
  });

  if (positionalArguments.length > 1) {
    throw new Error("Expected at most one GitHub themes URL.");
  }

  return {
    dryRun,
    githubThemesUrl: positionalArguments[0] || DEFAULT_REMOTE_THEMES_URL
  };
}

async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseCliOptions(argv);
  const result = await updateThemeColorPacksFromGitHub({
    dryRun: options.dryRun,
    githubThemesUrl: options.githubThemesUrl
  });

  console.log(result.summaryLines.join("\n"));
}

function runCli(): void {
  main().catch((error: unknown) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    console.error(normalizedError.message);
    process.exitCode = 1;
  });
}

if (require.main === module) {
  runCli();
}

export {
  main,
  parseCliOptions,
  runCli
};
