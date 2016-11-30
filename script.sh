#!/bin/bash

# Syntax :
# script.sh directory

treefile="treefile.tree"
tmpfile="tmptreefile.tree"
outfile="outputfile.csv"

if [ -e $1 ]; then


    tree -s -f -F -i -n -u --du -o "$treefile" --timefmt "%s" --noreport "$1"

    tail -n +2 "$treefile" > "$tmpfile"

    echo "filename;owner;size;timestamp;fileext;filetype" > "$outfile"

    while IFS='' read -r line || [[ -n "$line" ]]; do
        #length=$(wc -c "$line")
        
        #sizeget=$(echo "$line" | egrep -o '[0-9]+ ')
        #size=$(sed "s/[[:space:]]//g" <<< $sizeget)
        #timestampget=$(echo "$line" | egrep -o '[0-9]+\]')
        #timestampget2=$(sed "s/[[:space:]]*//g" <<< $timestampget)
        #timestamp=$(sed "s/\]//g" <<< $timestampget2)
        outputline=$(sed "s/^\[\([[:alnum:]]*\)[[:space:]]*\([[:digit:]]*\)[[:space:]]*\([[:digit:]]*\)\][[:space:]]*\(.*\)$/\1;\2;\3/" <<< "$line")
        filename=$(sed "s/^\[\([[:alnum:]]*\)[[:space:]]*\([[:digit:]]*\)[[:space:]]*\([[:digit:]]*\)\][[:space:]]*\(.*\)$/\4/" <<< "$line")
        
        filetype="f"
        lastchar=$(echo $filename | tail -c 2)
        if [ "$lastchar" = "*" ]; then
            filetype="x"
            filename=$(echo $filename | head -c -2)
        elif [ "$lastchar" = "/" ]; then
            filetype="d"
            filename=$(echo $filename | head -c -2)
        fi
        
        #owner=$(sed "s/[[:space:]]*//g" <<< $filename)
        #owner=$(sed "p/[^ ]*/g" <<< $owner)

        IFS=';' read -ra elements <<< "$filename"
        nbelements=${#elements[@]}
        lastelementindex=$(($nbelements - 1))
        lastelement=${elements[$lastelementindex]}
        
        IFS='/' read -ra fileparts <<< "$lastelement"
        nbparts=${#fileparts[@]}
        lastindex=$(($nbparts - 1))
        lastpart=${fileparts[$lastindex]}

        IFS='.' read -ra fileinterdots <<< "$lastpart"
        nbinterdots=${#fileinterdots[@]}
        if [ $nbinterdots -gt 1 ]; then
            lastinterdotindex=$(($nbinterdots - 1))
            
            fileext=${fileinterdots[$lastinterdotindex]}
        else
            fileext=""
        fi
        

        echo "$filename;$outputline;$fileext;$filetype" >> "$outfile"
    done < "$tmpfile"
fi

rm "$tmpfile"
rm "$treefile"