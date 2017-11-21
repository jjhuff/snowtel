realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
CONFIG_DIR="$HOME/.snowtel_config"

function DockerRun() {
  PRE=$1
  shift

  mkdir -p $CONFIG_DIR/gcloud/
  touch $CONFIG_DIR/appcfg_oauth2_tokens
  docker run \
    --rm \
    -it \
    --volume=$SCRIPT_DIR:/src/app \
    --volume=$CONFIG_DIR/appcfg_oauth2_tokens:/root/.appcfg_oauth2_tokens \
    --volume=$CONFIG_DIR/gcloud/:/root/.config/gcloud/ \
    $PRE snowtel $@
}

function DockerBuild() {
  echo "Buidling docker image..."
  docker build -q -t snowtel $SCRIPT_DIR
}

