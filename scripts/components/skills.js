async function GetSkills() {
    try {
        const response = await fetch('/data/skills.json');
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error('Error: ', error);
        return null;
    }
}

var elements = [];

function ClearElements() {
    elements.forEach(element => {
        element.style.color = '#fff';
    });
}

function GenerateWordCloud(container, list) {
    var width = container.clientWidth / 1024;

    WordCloud(container, {
        list: list,
        fontFamily: "Poppins, sans-serif",
        fontWeight: "bold",
        color: '#fff',
        minSize: 0, // 0 to disable
        weightFactor: function(size) {
            return Math.pow(size, 2.2) * width;
        },
        clearCanvas: false,
        backgroundColor: '#5c74ad',
        gridSize: Math.round(16 * width),
        drawOutOfBound: false,
        shrinkToFit: true,
        origin: null, // origin of the “cloud” in [x, y]
        drawMask: false, // visualize the grid
        maskColor: 'rgba(255,0,0,0.3)',
        maskGapWidth: 0.3,
        wait: 10,
        abortThreshold: 0, // disabled
        abort: function noop () {},
        minRotation: -Math.PI / 2,
        maxRotation: Math.PI / 2,
        rotationSteps: 0,
        shuffle: false,
        rotateRatio: 0.1,
        // circle, cardioid, diamond, square, triangle-forward,
        // triangle, pentagon, and star
        shape: 'circle',
        ellipticity: 0.65,
        // allows the user to define the class of the span elements
        classes: null,
        // callback
        hover: function(item, dimension, event) {
            var shouldClear = false;

            if(item === null) {
                shouldClear = true;
            }

            if(shouldClear === false) {
                elements.forEach(element => {
                    if(element != event.srcElement) {
                        shouldClear = true;
                    }
                });
            }

            if(shouldClear) {
                ClearElements();
            }

            if(event.srcElement !== container) {
                // console.log('we have left the span elements');
                event.srcElement.style.color = '#404040';
                if(elements.includes(event.srcElement) === false) {
                    elements.push(event.srcElement);
                }
            }
        },
        click: null
    });
}


// Get the container element where the word cloud will be displayed
var container = document.getElementById('canvas');
var body = document.getElementById("body");

container.addEventListener("mouseleave", function() {
    ClearElements();
});

GetSkills().then(skills => {
        // Process the loaded JSON data
        // console.log(skills);
        GenerateWordCloud(container, skills);

        window.addEventListener('resize', function(event) {
            GenerateWordCloud(container, skills);
        }, true);
    }
);