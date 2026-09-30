// CI/CD pipeline for prornd-ui → Testing server (172.17.1.46).
// Tracked branch: testing-frontend. See JENKINS_CI_CD_PLAN.md in the bench root.
//
// PREREQUISITES (this pipeline fails loudly if they're missing):
//   1. /home/rndadmin/deploy-config/prornd-ui/testing.env.production must exist,
//      holding THIS server's real VITE_* values. The .env.production committed to
//      git is NOT trusted — it points at a different server. See DEVELOPER_CONFIG_GUIDE.md.
//   2. In rndopsapp, these must be UNTRACKED (git rm --cached) or the backend
//      pipeline's checkout will revert every frontend deploy:
//        rndopsapp/www/rndopsapp.html
//        rndopsapp/public/frontend/index.html
//        rndopsapp/public/frontend/vite.svg
//   3. The rndopsapp-deploy-test job must have "Clean before checkout" DISABLED,
//      so it doesn't delete the build output this job writes.

pipeline {
  agent any

  triggers { pollSCM('H/3 * * * *') }

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 20, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    NPM        = '/home/rndadmin/.nvm/versions/node/v20.20.2/bin/npm'
    BENCH      = '/home/rndadmin/.local/bin/bench'
    BENCH_DIR  = '/home/rndadmin/frappe-dev/prornd'
    SITE       = 'prornd.local'
    RNDOPSAPP  = '/home/rndadmin/frappe-dev/prornd/apps/rndopsapp/rndopsapp'
    ENV_FILE   = '/home/rndadmin/deploy-config/prornd-ui/testing.env.production'
    BASE_URL   = 'http://127.0.0.1:8000'
  }

  stages {
    // Overwrite the committed .env.production with this server's real values.
    // Without this the build bakes in another environment's backend IP and the
    // app silently talks to the wrong host.
    stage('Inject server config') {
      steps {
        sh '''
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
        sh '''
          set -euo pipefail
          "$NPM" ci
        '''
      }
    }

    stage('Build') {
      steps {
        sh '''
          set -euo pipefail
          "$NPM" run build -- --mode production
          test -f dist/index.html || { echo "FATAL: build produced no dist/index.html"; exit 1; }
          ls dist/assets/*.js >/dev/null 2>&1 || { echo "FATAL: build produced no JS bundles"; exit 1; }
        '''
      }
    }

    // Frappe serves apps/rndopsapp/rndopsapp/public/ at /assets/rndopsapp/
    // (via the sites/assets/rndopsapp symlink), and www/rndopsapp.html at /rndopsapp.
    // Same convention as deploy-prod.sh, minus its `npm run preview` line, which
    // never exits and would hang this stage forever.
    stage('Deploy') {
      steps {
        sh '''
          set -euo pipefail
          test -d "$RNDOPSAPP" || { echo "FATAL: $RNDOPSAPP not found"; exit 1; }

          mkdir -p "$RNDOPSAPP/public/frontend"
          rm -rf "$RNDOPSAPP/public/frontend"/*
          cp -r dist/. "$RNDOPSAPP/public/frontend/"

          mkdir -p "$RNDOPSAPP/www"
          cp dist/index.html "$RNDOPSAPP/www/rndopsapp.html"

          cd "$BENCH_DIR" && "$BENCH" --site "$SITE" clear-cache
        '''
      }
    }

    // A 200 on /rndopsapp alone proves nothing: the page can render while every
    // JS/CSS bundle 404s (that was the live state of this server before this
    // pipeline existed). So resolve the asset the HTML actually references.
    stage('Smoke test') {
      steps {
        sh '''
          set -euo pipefail

          html=$(curl -fsS -H "Host: prornd.local" "$BASE_URL/rndopsapp")

          asset=$(printf '%s' "$html" \
            | grep -oE 'src="/assets/rndopsapp/frontend/assets/[^"]+\\.js"' \
            | head -1 | sed -E 's/.*src="([^"]+)".*/\\1/')

          if [ -z "$asset" ]; then
            echo "FATAL: no JS bundle referenced in the served page"
            exit 1
          fi

          code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: prornd.local" "$BASE_URL$asset")
          if [ "$code" != "200" ]; then
            echo "FATAL: page references $asset but it returns HTTP $code"
            echo "The deploy did not land where Frappe serves it from."
            exit 1
          fi

          echo "OK: /rndopsapp serves and its bundle $asset resolves 200"
        '''
      }
    }
  }

  post {
    success { echo "Deployed testing-frontend to 172.17.1.46" }
    failure { echo "Deploy FAILED — 172.17.1.46 may be serving a stale or broken frontend. Check the stage above." }
  }
}
