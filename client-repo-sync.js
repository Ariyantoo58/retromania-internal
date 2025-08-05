#!/usr/bin/env node
/**
 * Sinkron bare-repoo ↔ internal ↔ client (tanpa PAT).
 * Pastikan user Linux yang men-jalan­kan skrip sudah punya:
 *   • SSH key / credential-store yang bisa push-pull ke repo page.
 */

const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const REPO_DIR = path.join(__dirname, 'client-repo.git'); // bare repo
const AUTHOR_NAME = 'ScriptSmelter Bot';
const AUTHOR_EMAIL = 'opensrc-bot@scriptsmelter.com';

const sh = (cmd) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
};

/* ─── pre-flight ─────────────────────────────────────────── */
if (!fs.existsSync(REPO_DIR)) {
  console.error(`Repo bare '${REPO_DIR}' tidak ditemukan.`);
  process.exit(1);
}

/* ─── main ───────────────────────────────────────────────── */
process.chdir(REPO_DIR);

// ‣ pastikan remote bersih (tak ada token hard-codedd
sh(
  'git remote set-url internal https://github.com/Ariyantoo58/retromania-internal.git'
);
sh(
  'git remote set-url client https://github.com/infinityCodeDevs/retromania-game.git'
);

/* 1. fetch keduanya */
sh('git fetch internal --prune');
sh('git fetch client   --prune');

/* 2. commit baru klien → internal (namespace client/*) */
sh('git push internal refs/remotes/client/*:refs/heads/client/*');

/* 3. branch feat/* internal disalin & disanitasi → victor_* */
const list = execSync(
  'git for-each-ref --format="%(refname)" refs/remotes/internal/feat'
)
  .toString()
  .trim();

if (list) {
  list.split('\n').forEach((ref) => {
    const short = ref.replace('refs/remotes/internal/feat/', '');
    const exportBranch = `victor_${short}`;
    const tmp = path.join(__dirname, `.wt_${short}_${Date.now()}`);

    // worktree checkout
    sh(`git worktree add --force ${tmp} ${ref}`);

    // rewrite author/committer
    process.chdir(tmp);
    sh(`git filter-branch --force --env-filter '
      export GIT_AUTHOR_NAME="${AUTHOR_NAME}";
      export GIT_AUTHOR_EMAIL="${AUTHOR_EMAIL}";
      export GIT_COMMITTER_NAME="${AUTHOR_NAME}";
      export GIT_COMMITTER_EMAIL="${AUTHOR_EMAIL}";
    ' -- --all`);

    // masukkan hasil ke bare repo
    process.chdir(REPO_DIR);
    sh(`git fetch ${tmp} HEAD:refs/heads/${exportBranch}`);

    // bersih-bersih
    sh(`git worktree remove ${tmp} --force`);
  });
}

/* 4. branch victor_* → repo klien */
sh('git push client refs/heads/victor_* --prune');

console.log('✅  Sync selesai');
