import JSON5 from "json5"

type BuildPlanItem = {
  filePath: string,
  action: "add" | "edit",
  description: string
};

// A plan containing a list of files to edit or add in a repository.
export class BuildPlan {
  items: BuildPlanItem[] = []

  // Parse the output of a ChatGPT request into a BuildPlan object.
  constructor(inputText: string, files: string[]) {
    // Remove leading "./" from filenames.
    const fixPath = (file: string) => file.trim().replace(/^\.\//, '');
    const fixedPaths = files.map(fixPath);
    console.log(fixedPaths)
    // Convert arrays into objects.
    this.items = JSON5.parse(inputText)
      .map(([filePath, action, description]: [string, string, string]) => {
        const fixedPath = fixPath(filePath);
        // Set to edit or new based on if the file exists in the repository.
        const exists = fixedPaths.includes(fixedPath);
        return {
          // Normalize filenames.
          filePath: fixedPath,
          action: exists ? "edit" : "add",
          description
        }
      });
    return this;
  }

  // A string describing how each file will be changed.
  readableString = () => {
    const previewItemString = (item: BuildPlanItem) => `- ${item.action} ${item.filePath}: ${item.description}`
    return this.items.map(previewItemString).join("\n")
  }

  // A string containing the contents of each file that will be changed.
  readableContents = async (readFile: (input: string) => Promise<string>) => {
    // Only include files that exist already.
    const existingFileItems = this.items.filter(item => item.action === "edit");
    // Get the contents of each file as a string.
    const getFileContents = async ({ filePath }: BuildPlanItem) => {
      const fileContents = await readFile(filePath)
      const delimiter = "\n```\n"
      return `*${filePath}*:${delimiter}${fileContents}${delimiter}`;
    }
    const repositoryContents = await Promise.all(
      existingFileItems.map(getFileContents)
    )
    return repositoryContents.join("\n")
  }
}
