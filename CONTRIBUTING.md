# Contributing to TGCloud

Thank you for considering contributing to TGCloud! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for TGCloud. Following these guidelines helps maintainers understand your report, reproduce the issue, and find related reports.

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as much detail as possible.
* **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem.
* **If the problem wasn't triggered by a specific action**, describe what you were doing before the problem happened.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for TGCloud, including completely new features and minor improvements to existing functionality.

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as much detail as possible.
* **Provide specific examples to demonstrate the steps** or point out the part of TGCloud which the suggestion is related to.
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Include screenshots and animated GIFs** which help you demonstrate the steps or point out the part of TGCloud which the suggestion is related to.
* **Explain why this enhancement would be useful** to most TGCloud users.
* **List some other applications where this enhancement exists** if applicable.

### Pull Requests

* Fill in the required template
* Follow the [style guides](#style-guides)
* Document new code
* End all files with a newline

## Style Guides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Consider starting the commit message with an applicable emoji:
    * 🎨 `:art:` when improving the format/structure of the code
    * 🐎 `:racehorse:` when improving performance
    * 🚱 `:non-potable_water:` when plugging memory leaks
    * 📝 `:memo:` when writing docs
    * 🐛 `:bug:` when fixing a bug
    * 🔥 `:fire:` when removing code or files
    * 💚 `:green_heart:` when fixing the CI build
    * ✅ `:white_check_mark:` when adding tests
    * 🔒 `:lock:` when dealing with security
    * ⬆️ `:arrow_up:` when upgrading dependencies
    * ⬇️ `:arrow_down:` when downgrading dependencies

### JavaScript/TypeScript Style Guide

* Use 2 spaces for indentation
* Use semicolons
* Use single quotes for strings
* Prefer arrow functions over function expressions
* Use template literals instead of string concatenation
* Use destructuring assignment when possible
* Use the spread operator (`...`) instead of `Object.assign`
* Add trailing commas for cleaner diffs
* Use `const` for all references; avoid `var`
* Use `let` instead of `var` when you need to reassign references
* Group your `const`s and then group your `let`s

### CSS/SCSS Style Guide

* Use 2 spaces for indentation
* When using multiple selectors in a rule declaration, give each selector its own line
* Put a space before the opening brace `{` in rule declarations
* Put closing braces `}` of rule declarations on a new line
* Put blank lines between rule declarations

## Setting Up Development Environment

1. Clone the repository:
```bash
git clone https://github.com/yourusername/TGCloud.git
cd TGCloud
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Create a `.env.local` file based on `.env.example` and fill in your development credentials.

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Testing

We use Jest for testing. To run tests:

```bash
npm test
# or
yarn test
# or
pnpm test
```

Make sure to write tests for new features and fix any failing tests before submitting a pull request.

## Documentation

* Update documentation when creating or modifying features.
* Use clear and consistent language in documentation.
* Check for spelling and grammar errors.

## Additional Notes

### Issue and Pull Request Labels

This section lists the labels we use to help us track and manage issues and pull requests.

* `bug` - Issues that are bugs
* `documentation` - Issues or PRs related to documentation
* `duplicate` - Issues or PRs that are duplicates
* `enhancement` - Issues that are feature requests or PRs that implement new features
* `good first issue` - Good for newcomers
* `help wanted` - Extra attention is needed
* `invalid` - Issues that are invalid or non-reproducible
* `question` - Issues that are questions
* `wontfix` - Issues that will not be fixed

## Thank You!

Thank you for contributing to TGCloud! Your time and effort help make this project better for everyone.