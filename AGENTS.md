# Agent instructions

## Writing issues

Issues made through the API or a CLI skip the GitHub issue forms. So write the body with the same headings the forms use.

Bug, label `bug`, title starts with `[Bug]: `:

```md
### What happened?

### Steps to reproduce
1.

### Expected behavior

### Device and browser
```

Feature, label `enhancement`, title starts with `[Feature]: `:

```md
### Problem

### Proposed solution

### Alternatives
```

- Leave out an optional section if you have nothing for it. Don't write "N/A".
- One issue per problem or idea.

## Language

This covers issues, comments, commits, and PRs.

- Use short, simple English. One idea per sentence.
- Start with the problem, then the fix. Don't list every change. The diff shows that.
- Use plain words: "use" not "utilize", "fix" not "remediate".
- No em dashes, no emoji, no filler words like "comprehensive" or "robust".
- Keep code names, file paths, and commands exactly as they are.
