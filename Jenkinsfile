// CI/CD pipeline for prornd-ui → Testing server (172.17.1.46).
// Tracked branch: testing-frontend. See JENKINS_CI_CD_PLAN.md in the bench root.
//
// WHAT THIS SERVES, AND WHY NOT VIA FRAPPE:
// The build is served standalone on port 8081 by `vite preview`, kept alive by
// the prornd-ui systemd user unit, so it returns by itself after a reboot.
//
// It is deliberately NOT copied into rndopsapp/public/frontend to be served at
// Frappe's /rndopsapp route, even though deploy-prod.sh and CLAUDE.md describe
// that. vite.config.ts hardcodes `base: '/'`, so the bundle is referenced as
// /assets/index-<hash>.js — correct when dist/ is served at a web root, but a
// 404 under Frappe's /assets/rndopsapp/frontend/ prefix. The /rndopsapp route
// still holds an old build whose assets 404; serving it properly would mean
// changing `base`, which affects every developer and environment.
//
// PREREQUISITE (this pipeline fails loudly without it):
//   /home/rndadmin/deploy-config/prornd-ui/testing.env.production must exist,
//   holding THIS server's real VITE_* values. The .env.production committed to
//   git points at a different environment. See DEVELOPER_CONFIG_GUIDE.md.

// ---------------------------------------------------------------------------
// NOTIFICATIONS  (see DEPLOY_NOTIFICATIONS_PLAN.md in the bench root)
//
// Mirror of the notify block in rndopsapp's Jenkinsfile. Deliberately a copy
// for now - two is tolerable, four will drift, so this belongs in a Jenkins
// Shared Library once both are proven. If you edit one, edit the other: the
// whole point is that both repos tell developers the same thing in the same
// words.
//
// Fires from the DEPLOY, not the merge. On 2026-10-07 merges kept landing on
// the testing branches while deploys failed, so a GitHub-side "X merged"
// message would have told everyone to pull code that was never served. The two
// outcomes therefore say opposite things: "rebase" vs "do NOT pull".
//
// Mattermost DMs and email go out in SEPARATE try/catch blocks, so a
// Mattermost outage cannot suppress the email and neither can fail the deploy.
//
// Recipients: /home/rndadmin/deploy-config/notify-recipients.json - not in
// this repo, which is public, and where committed config is overwritten by the
// next deploy anyway. The path is spelled out in each method because a
// script-level `def CONST` is NOT visible inside a `def method()` here; it
// silently resolves to null at runtime.
// ---------------------------------------------------------------------------

def notifyAll(String outcome) {
  def msg
  try {
    msg = buildMessage(outcome)
  } catch (e) {
    echo "WARNING: could not compose the notification: ${e}"
    return
  }
  echo "--- notification text ---\n${msg}\n-------------------------"

  try {
    notifyMattermost(msg)
  } catch (e) {
    echo "WARNING: Mattermost notify failed: ${e}"
    // The deploy worked; telling people did not. Jenkins only ever worsens a
    // result, so this cannot mask a real FAILURE.
    currentBuild.result = 'UNSTABLE'
  }
  try {
    notifyEmail(outcome, msg)
  } catch (e) {
    echo "WARNING: email notify failed: ${e}"
    currentBuild.result = 'UNSTABLE'
  }
}

// Built entirely in shell and returned as one string: the Groovy sandbox
// rejects more than you would expect (`env[k] = v` cost the Live job its build
// #17), so this code passes only whole strings and does no map or array work
// in Groovy.
def buildMessage(String outcome) {
  return sh(returnStdout: true, script: """#!/bin/bash
    set -euo pipefail
    R=/home/rndadmin/deploy-config/notify-recipients.json
    sha=\$(git log -1 --format=%h)
    raw=\$(git log -1 --format=%an)
    subj=\$(git log -1 --format=%s)
    # One person commits under three name spellings and two identities share an
    # address, so map the git name to a real person. Unmapped falls through.
    who=\$(jq -r --arg n "\$raw" '.identities[\$n] // \$n' "\$R")

    if [ '${outcome}' = 'ok' ]; then
      cat <<EOF
testing-frontend is updated on Testing (http://172.17.1.46:8081)

  \$sha  \$who - \$subj
  npm ci - built - served - bundle resolves 200 - SPA fallback ok - ${currentBuild.durationString.replace(' and counting', '')}

Pull / rebase your feature branch before your next push.
  ${env.BUILD_URL}
EOF
    else
      cat <<EOF
testing-frontend deploy FAILED on Testing (http://172.17.1.46:8081)

  \$sha  \$who - \$subj
  Testing is still serving the PREVIOUS build. Do NOT pull yet.

  ${env.BUILD_URL}console
EOF
    fi
  """).trim()
}

def notifyMattermost(String msg) {
  withCredentials([string(credentialsId: 'mattermost-deploy-webhook', variable: 'MM_HOOK')]) {
    withEnv(["NOTIFY_MSG=${msg}"]) {
      sh '''#!/bin/bash
        # No -e: one failed DM must not abort the rest of the loop.
        set -uo pipefail
        R=/home/rndadmin/deploy-config/notify-recipients.json

        # Force a leading @: Mattermost's webhook "channel" field treats a bare
        # name as a CHANNEL, not a user, so a bare entry either fails or posts
        # into an unrelated channel of that name. Five of the first eight
        # entries written by hand were bare.
        mapfile -t targets < <(jq -r '.mattermost_dm[]? | if startswith("@") then . else "@" + . end' "$R")

        # A channel, by contrast, must NOT be @-prefixed.
        ch=$(jq -r '.mattermost_channel // ""' "$R")
        if [ -n "$ch" ]; then targets+=("${ch#@}"); fi

        if [ "${#targets[@]}" -eq 0 ]; then
          echo "FATAL: mattermost_dm is empty in $R - nobody would be messaged."
          exit 1
        fi

        ok=0; bad=0
        for t in "${targets[@]}"; do
          # jq builds the JSON so a subject containing a quote, backslash or
          # newline cannot produce a malformed payload.
          payload=$(jq -n --arg ch "$t" --arg txt "$NOTIFY_MSG" '{channel:$ch, text:$txt}')
          # -L with --post301/--post302: Mattermost builds webhook URLs from its
          # configured Site URL, which may not be the address reachable here, so
          # the URL can redirect. Plain curl downgrades a followed POST to GET,
          # which Mattermost rejects - the DM would silently never arrive.
          if curl -fsS -L --post301 --post302 --max-time 15 \
               -X POST -H 'Content-Type: application/json' \
               --data-binary "$payload" "$MM_HOOK" >/dev/null; then
            ok=$((ok + 1))
          else
            bad=$((bad + 1))
            echo "  DM to $t FAILED"
          fi
        done
        echo "Mattermost: $ok delivered, $bad failed, of ${#targets[@]}"
        [ "$bad" -eq 0 ]
      '''
    }
  }
}

def notifyEmail(String outcome, String msg) {
  def to = sh(returnStdout: true, script: '''#!/bin/bash
    set -euo pipefail
    jq -r '.email_to | join(",")' /home/rndadmin/deploy-config/notify-recipients.json
  ''').trim()

  // An empty list would mean a pipeline that reports success while telling
  // nobody - the same class of bug as a deploy that reports success while
  // deploying nothing.
  if (!to) {
    error "email_to is empty in notify-recipients.json - refusing to 'send' to nobody"
  }

  def subject = (outcome == 'ok')
    ? '[prornd] testing-frontend updated on Testing - rebase your branch'
    : '[prornd] testing-frontend deploy FAILED on Testing - do not pull'

  mail to: to, subject: subject, body: msg
  echo "email sent to: ${to}"
}


pipeline {
  agent any

  triggers { pollSCM('H/3 * * * *') }

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 25, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    // nvm's bin must be on PATH, not just referenced by absolute path: npm is a
    // node script (#!/usr/bin/env node), and vite shells out to node too. Without
    // this, every npm call dies with "/usr/bin/env: 'node': No such file or
    // directory" (exit 127), because a systemd service's PATH has no nvm.
    PATH        = "/home/rndadmin/.nvm/versions/node/v20.20.2/bin:${env.PATH}"
    NPM         = '/home/rndadmin/.nvm/versions/node/v20.20.2/bin/npm'
    ENV_FILE    = '/home/rndadmin/deploy-config/prornd-ui/testing.env.production'
    PORT        = '8081'
    BASE_URL    = 'http://127.0.0.1:8081'
  }

  stages {
    // Overwrite the committed .env.production with this server's real values.
    // Vite bakes VITE_* into the bundle at build time, so without this the app
    // silently talks to whichever environment the committed file points at.
    stage('Inject server config') {
      steps {
        sh '''#!/bin/bash
          set -euo pipefail
          if [ ! -f "$ENV_FILE" ]; then
            echo "FATAL: $ENV_FILE not found."
            echo "Create it with this server's real VITE_* values before deploying."
            echo "Refusing to build with the values committed in git."
            exit 1
          fi
          cp "$ENV_FILE" .env.production
          echo "Using backend host: $(grep -E '^VITE_APP_BACKEND_HOST=' .env.production || echo '(not set!)')"
        '''
      }
    }

    stage('Install') {
      steps {
        sh '''#!/bin/bash
          set -euo pipefail
          "$NPM" ci
        '''
      }
    }

    stage('Build') {
      steps {
        sh '''#!/bin/bash
          set -euo pipefail
          "$NPM" run build -- --mode production
          test -f dist/index.html || { echo "FATAL: build produced no dist/index.html"; exit 1; }
          ls dist/assets/*.js >/dev/null 2>&1 || { echo "FATAL: build produced no JS bundles"; exit 1; }
        '''
      }
    }

    // Restart the preview server onto the build just produced. It runs as the
    // prornd-ui user unit (not a tmux session, which did not survive reboots),
    // with WorkingDirectory set to this workspace — so it picks up the new
    // dist/ with nothing to copy.
    stage('Serve') {
      steps {
        sh '''#!/bin/bash
          set -euo pipefail

          # Jenkins is a SYSTEM service running as rndadmin, so it inherits no
          # XDG_RUNTIME_DIR and `systemctl --user` cannot find the user bus
          # without it. /run/user/1000 persists with no login only because
          # lingering is enabled for rndadmin (loginctl enable-linger).
          export XDG_RUNTIME_DIR=/run/user/$(id -u)

          if ! systemctl --user cat prornd-ui.service >/dev/null 2>&1; then
            echo "FATAL: prornd-ui.service not found for user $(whoami)."
            echo "Expected at ~/.config/systemd/user/prornd-ui.service"
            exit 1
          fi

          # Guard against the unit's WorkingDirectory having drifted from this
          # workspace — it would then serve a different (stale) build than the
          # one just built here, with nothing to indicate it.
          want="$WORKSPACE"
          got=$(systemctl --user show prornd-ui -p WorkingDirectory --value)
          if [ "$got" != "$want" ]; then
            echo "FATAL: prornd-ui.service serves '$got' but this build produced '$want'."
            echo "Update WorkingDirectory in ~/.config/systemd/user/prornd-ui.service"
            exit 1
          fi

          systemctl --user restart prornd-ui
        '''
      }
    }

    stage('Wait for server') {
      steps {
        sh '''#!/bin/bash
          set -euo pipefail
          for i in $(seq 1 30); do
            if curl -fsS -o /dev/null "$BASE_URL/" 2>/dev/null; then
              echo "OK: preview server up after $((i * 2))s"
              exit 0
            fi
            sleep 2
          done
          echo "FATAL: nothing answered on $BASE_URL within 60s"
          echo "Logs: journalctl --user -u prornd-ui -n 50 --no-pager"
          exit 1
        '''
      }
    }

    // A 200 on / proves nothing: the page can render while every bundle 404s,
    // which is exactly the state the /rndopsapp route is in. So resolve the
    // bundle the served HTML actually references. Note the `|| true` on the
    // extraction — without it, a non-matching grep would trip pipefail and kill
    // the script before reaching the error message below.
    stage('Smoke test') {
      steps {
        sh '''#!/bin/bash
          set -euo pipefail

          html=$(curl -fsS "$BASE_URL/")

          asset=$(printf '%s' "$html" \
            | grep -oE 'src="[^"]+\\.js"' \
            | head -1 | sed -E 's/.*src="([^"]+)".*/\\1/') || true

          if [ -z "${asset:-}" ]; then
            echo "FATAL: no JS bundle referenced in the served page"
            printf '%s\\n' "$html" | head -20
            exit 1
          fi

          code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL$asset")
          if [ "$code" != "200" ]; then
            echo "FATAL: page references $asset but it returns HTTP $code"
            exit 1
          fi

          # react-router needs unknown paths to fall back to index.html
          deep=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/projects/smoke-test")
          if [ "$deep" != "200" ]; then
            echo "FATAL: SPA fallback broken — deep link returned HTTP $deep"
            exit 1
          fi

          echo "OK: / serves, bundle $asset resolves 200, SPA fallback works"
        '''
      }
    }
  }

  post {
    success {
      echo "Deployed testing-frontend to http://172.17.1.46:8081"
      script { notifyAll('ok') }
    }
    failure {
      echo "Deploy FAILED — 172.17.1.46:8081 may be down or serving a stale build. Check the stage above."
      script { notifyAll('fail') }
    }
  }
}
