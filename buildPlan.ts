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
    // Convert arrays into objects.
    const plan = JSON5.parse(inputText)
      .map(([filePath, action, description]: [string, string, string]) => {
        return { filePath, action, description }
      });
    // Set to edit or new based on if the file exists in the repository.
    this.items = plan.map((item: BuildPlanItem) => {
      return {
        ...item,
        action: files.includes(item.filePath) ? "edit" : "add"
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
