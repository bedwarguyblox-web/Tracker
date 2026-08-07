---
name: GitHub remote history
description: The connected Tracker GitHub repository and the current workspace use unrelated Git histories.
---

The connected GitHub repository's `main` branch contains the older standalone Next/Supabase project, while this workspace uses the Replit artifact monorepo structure. A normal pull cannot merge them because there is no common ancestor.

**Why:** A direct push to the remote `main` would replace or conflict with the older repository rather than cleanly update it.

**How to apply:** Push the current workspace to a separate feature branch and leave remote `main` untouched unless the user explicitly confirms a destructive replacement or chooses a manual migration path.