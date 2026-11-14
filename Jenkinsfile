pipeline {
  agent any

  // Tantangan K04: pipeline berparameter staging / production
  parameters {
    choice(name: 'TARGET', choices: ['staging', 'production'], description: 'Lingkungan tujuan deploy')
  }

  environment {
    IMAGE      = 'GANTI_USER_DOCKERHUB/laparin'      // <-- ganti
    TAG        = "${env.BUILD_NUMBER}"
    APP_PORT   = "${params.TARGET == 'production' ? '8000' : '8001'}"
    PROJECT    = "laparin-${params.TARGET}"
    ENV_CRED   = "laparin-env-${params.TARGET}"       // Secret file di Jenkins Credentials
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Test') {
      steps { sh 'docker build --target test -t $IMAGE:test .' }
    }

    stage('Build Image') {
      steps { sh 'docker build --target runtime -t $IMAGE:$TAG -t $IMAGE:latest .' }
    }

    stage('Push Image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials',
                         usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh 'echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin'
          sh 'docker push $IMAGE:$TAG && docker push $IMAGE:latest'
        }
      }
    }

    stage('Deploy') {
      steps {
        withCredentials([file(credentialsId: "${ENV_CRED}", variable: 'ENVFILE')]) {
          sh '''
            export IMAGE_TAG=$TAG
            docker compose -p $PROJECT --env-file "$ENVFILE" pull app
            docker compose -p $PROJECT --env-file "$ENVFILE" up -d db
            docker compose -p $PROJECT --env-file "$ENVFILE" run --rm app node src/migrate.js
            docker compose -p $PROJECT --env-file "$ENVFILE" run --rm app node src/seed.js
            docker compose -p $PROJECT --env-file "$ENVFILE" up -d
            docker compose -p $PROJECT --env-file "$ENVFILE" ps
          '''
        }
      }
    }

    stage('Smoke Test') {
      steps {
        // Jika Jenkins berjalan di dalam container, ganti localhost dengan host.docker.internal
        sh '''
          for i in $(seq 1 20); do
            CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT/health || true)
            echo "percobaan $i: HTTP $CODE"
            [ "$CODE" = "200" ] && exit 0
            sleep 5
          done
          echo "Smoke test gagal: /health tidak 200"; exit 1
        '''
      }
    }
  }

  post {
    success { echo "Pipeline SUKSES: Laparin (${params.TARGET}) ter-deploy dengan tag ${env.BUILD_NUMBER}" }
    failure { echo "Pipeline GAGAL: cek stage yang merah (target: ${params.TARGET})" }
  }
}
