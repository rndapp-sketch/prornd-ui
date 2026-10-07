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
    success { echo "Deployed testing-frontend to http://172.17.1.46:8081" }
    failure { echo "Deploy FAILED — 172.17.1.46:8081 may be down or serving a stale build. Check the stage above." }
  }
}
