# Discover — curated list

`curated.json` is the canonical list shown in Bridge's Discover tab. It's
hand-maintained, not crowdsourced — quality bar over comprehensiveness.

## Adding an entry

1. Open `curated.json`
2. Append an object to the `entries` array
3. Open a PR

The schema:

```ts
{
  id: string;             // lowercase, kebab-case, unique
  name: string;            // display name
  category: 'mcp' | 'plugin' | 'skill' | 'agent' | 'command' | 'hook';
  repoUrl: string;         // git-cloneable URL
  description: string;     // one or two sentences
  whyRecommended: string;  // single line explaining the recommendation
  maintainer: string;      // GitHub org or user
  tags?: string[];         // optional
}
```

## Quality bar

- Repo must be **public** and **cloneable**
- Maintainer should be **active** (commits within the last ~12 months)
- The thing must be **useful right now**, not "interesting in theory"
- One-line `whyRecommended` should explain why *this one* over alternatives

Order in the file matters — the top entries surface first.

## Removing an entry

If a repo is abandoned, broken, or replaced by something better, send a PR
removing it. Don't be precious — the list serves users, not authors.
