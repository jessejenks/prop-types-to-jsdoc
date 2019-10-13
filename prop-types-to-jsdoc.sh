#!/bin/bash

usage() {
cat << EOF
$0 usage
     -d | --dir             Path to input directory

    [-o | --out ]           Path to output directory

    [-v | --verbose]        Display file names as they get parsed
    
    [-w | --no-warnings]    Suppress warnings (flag)

    [-h | --help]           Help (display this message)

EOF
}

ARGS_COPY=( "$@" )

for arg in "$@"; do
    shift
    case "$arg" in 
        "--help")
            set -- "$@" "-h" ;;
        "--dir")
            set -- "$@" "-d" ;;
        "--out")
            set -- "$@" "-o" ;;
        "--verbose")
            set -- "$@" "-v" ;;
        "--no-warnings")
            set -- "$@" "-w" ;;
        "--"*)
            echo "Invalid option \"$arg\""
            exit 1
            ;;
        *)
            set -- "$@" "$arg"
    esac
done


INPUT_DIR=""
OUTPUT_DIR=""
VERBOSE="false"
SHOW_WARNINGS="true"

OPTIND=1
while getopts ":hd:o:vw" OPTION; do
    case $OPTION in
        h)
            usage
            exit 0
            ;;
        d)
            INPUT_DIR="$OPTARG" ;;
        o)
            OUTPUT_DIR="$OPTARG" ;;
        v)
            VERBOSE="true" ;;
        w)
            SHOW_WARNINGS="false" ;;
        \?)
            echo "Invalid option \"-$OPTARG\""
            exit 1
            ;;
        :)
            echo "\"${ARGS_COPY[$OPTIND-2]}\" Expected an argument"
            exit 1
            ;;
    esac            
done

if [[ -z $INPUT_DIR ]]; then
    echo "\x1b[31mExpected input directory\x1b[0m"
    usage
    exit 1
elif [ ! -z $OUTPUT_DIR ] && [ ! -d $OUTPUT_DIR ]; then
    echo "\x1b[31moutput directory does not exist\x1b[0m"
    usage
    exit 1
else
    for FILE in $(find $INPUT_DIR -path "*/node_modules" -prune -o -name "*.jsx" -print); do
        if [ $VERBOSE = "true" ]; then
            echo "\x1b[33mReading file:\x1b[0m $FILE"
        fi
        node prop-types-to-jsdoc.js "$FILE" "$OUTPUT_DIR" "$SHOW_WARNINGS"
    done
fi