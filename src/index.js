'use strict';
var _ = require('lodash');
var cyCanvas = require('cytoscape-canvas');

const DEF_LAYOUT = { name: 'preset', animate: false, numIter: 50, coolingFactor: 0.9, fit: false };

const DEF_VISUAL_STYLE = [
    {
        selector: 'node',
        style: {
            'background-color': '#f6eecb',//  '#da8a43',//'rgb(0, 220, 200)',
            'background-opacity': 0.8,
            'width': '40px',
            'height': '40px',
            'label': 'data(name)',
            'font-family': 'Roboto, sans-serif'
        }
    },
    {
        selector: 'edge',
        style: {
            'line-color': '#75736c',//'#76936f',
            'width': '2px',
            //   'label': 'data(interaction)',
            'font-family': 'Roboto, sans-serif',
            'text-opacity': 0.8,

            /*
             * NB:
             * setting "curve-style" to "bezier" for the "edge" selector in Cytoscape.js 3.2.9 shows
             * all multiple edges between two nodes separately;
             * in other words, if you do not specify 'curve-style': 'bezier', then multiple edges
             * between any two nodes will be shown on top of one another creating a deceptive visibility
             * of only one edge ...
             */
            'curve-style': 'bezier'
        }
    },
    {
        selector: 'node:selected',
        style: {
            'color': '#fb1605',
            'background-color': 'yellow'
        }
    },
    {
        selector: 'edge:selected',
        style: {
            'label': 'data(interaction)',
            'color': '#fb1605',
            'line-color': 'yellow',
            'width': 6
        }
    }
];

const CX_NUMBER_DATATYPES = ['byte', 'double', 'float', 'integer', 'long', 'short'];

const CX_LIST_DATATYPES =
    ['list_of_string', 'list_of_boolean',
        'list_of_byte', 'list_of_char', 'list_of_double', 'list_of_float', 'list_of_integer',
        'list_of_long', 'list_of_short'];

// there are 9 types of Node Shapes in Cytoscape 3.6.1 and 18 types of Node Shapes in Cytoscape.js 3.2.9;
// all Node Shapes of Cytoscape 3.6.1 map nicely to Node Body Shapes of Cytoscape.js 3.2.9.
const NODE_SHAPE_MAP = {
    'DIAMOND': 'diamond',
    'ELLIPSE': 'ellipse',
    'HEXAGON': 'hexagon',
    'OCTAGON': 'octagon',
    'PARALLELOGRAM': 'rhomboid',
    'RECTANGLE': 'rectangle',
    'ROUND_RECTANGLE': 'roundrectangle',
    'TRIANGLE': 'triangle',
    'VEE': 'vee'
};

// there are 22 arrow shapes in Cytoscape 3.6.1 and 10 arrow shapes in Cytoscape.js 3.2.9
const ARROW_SHAPE_MAP = {
    'ARROW': 'triangle',
    'ARROW_SHORT': 'triangle',
    'CIRCLE': 'circle',
    'CROSS_DELTA': 'triangle-tee',
    'CROSS_OPEN_DELTA': 'triangle-tee',
    'DELTA': 'triangle',
    'DELTA_SHORT_1': 'triangle',
    'DELTA_SHORT_2': 'triangle',
    'DIAMOND': 'diamond',
    'DIAMOND_SHORT_1': 'diamond',
    'DIAMOND_SHORT_2': 'diamond',
    'HALF_BOTTOM': 'triangle',
    'HALF_CIRCLE': 'triangle',
    'HALF_TOP': 'triangle',
    'NONE': 'none',
    'OPEN_CIRCLE': 'triangle',
    'OPEN_DELTA': 'triangle',
    'OPEN_DIAMOND': 'diamond',
    'OPEN_HALF_CIRCLE': 'triangle',
    'OPEN_SQUARE': 'square',
    'SQUARE': 'square',
    'T': 'tee'
};

// there are 16 line styles in Cytoscape 3.6.1 and 3 line styles in Cytoscape.js 3.2.9
const LINE_STYLE_MAP = {
    'BACKWARD_SLASH': 'dashed',
    'CONTIGUOUS_ARROW': 'solid',
    'LONG_DASH': 'dashed',
    'DASH_DOT': 'dotted',
    'DOT': 'dotted',
    'EQUAL_DASH': 'dashed',
    'FORWARD_SLASH': 'dashed',
    'MARQUEE_DASH': 'dashed',
    'MARQUEE_DASH_DOT': 'dotted',
    'MARQUEE_EQUAL': 'dashed',
    'PARALLEL_LINES': 'solid',
    'SEPARATE_ARROW': 'dashed',
    'SINEWAVE': 'solid',
    'SOLID': 'solid',
    'VERTICAL_SLASH': 'dashed',
    'ZIGZAG': 'solid'
};

const VALID_NODE_LABEL_POSITIONS = {
    'NW': 0,
    'N': 1,
    'NE': 2,

    'W': 3,
    'C': 4,
    'E': 5,

    'SW': 6,
    'S': 7,
    'SE': 8,

    'NONE': 9
};

/*
 * Shall we replace
 *      {'text-halign' : 'left', 'text-valign' : 'center'}
 *
 * with more compact
 *      {0: 'left', 1: 'center'}
 *
 * where  0 = 'text-halign'  1 = 'text-valign'
 * ?
 */
const CYTOSCAPE_TO_JS_NODE_LABEL_COORDINATES = {
    'C': {
        'C': { 'text-halign': 'center', 'text-valign': 'center' },  //  1
        'E': { 'text-halign': 'left', 'text-valign': 'center' },  //  2
        'NONE': { 'text-halign': 'center', 'text-valign': 'center' },  //  3

        'N': { 'text-halign': 'center', 'text-valign': 'center' },  //  4
        'NE': { 'text-halign': 'left', 'text-valign': 'center' },  //  5
        'NW': { 'text-halign': 'right', 'text-valign': 'center' },  //  6

        'S': { 'text-halign': 'center', 'text-valign': 'center' },  //  7
        'SE': { 'text-halign': 'left', 'text-valign': 'center' },  //  8
        'SW': { 'text-halign': 'right', 'text-valign': 'center' },  //  9

        'W': { 'text-halign': 'right', 'text-valign': 'center' }   // 10
    },
    'E': {
        'C': { 'text-halign': 'right', 'text-valign': 'center' },  // 11
        'E': { 'text-halign': 'center', 'text-valign': 'center' },  // 12
        'NONE': { 'text-halign': 'right', 'text-valign': 'center' },  // 13

        'N': { 'text-halign': 'right', 'text-valign': 'center' },  // 14
        'NE': { 'text-halign': 'center', 'text-valign': 'center' },  // 15
        'NW': { 'text-halign': 'right', 'text-valign': 'center' },  // 16

        'S': { 'text-halign': 'right', 'text-valign': 'center' },  // 17
        'SE': { 'text-halign': 'center', 'text-valign': 'center' },  // 18
        'SW': { 'text-halign': 'right', 'text-valign': 'center' },  // 19

        'W': { 'text-halign': 'right', 'text-valign': 'center' }   // 20
    },
    'NONE': {
        'C': { 'text-halign': 'center', 'text-valign': 'center' },  // 21
        'E': { 'text-halign': 'left', 'text-valign': 'center' },  // 22
        'NONE': { 'text-halign': 'center', 'text-valign': 'center' },  // 23

        'N': { 'text-halign': 'center', 'text-valign': 'center' },  // 24
        'NE': { 'text-halign': 'left', 'text-valign': 'center' },  // 25
        'NW': { 'text-halign': 'right', 'text-valign': 'center' },  // 26

        'S': { 'text-halign': 'center', 'text-valign': 'center' },  // 27
        'SE': { 'text-halign': 'left', 'text-valign': 'center' },  // 28
        'SW': { 'text-halign': 'right', 'text-valign': 'center' },  // 29

        'W': { 'text-halign': 'right', 'text-valign': 'center' }   // 30
    },
    'N': {
        'C': { 'text-halign': 'center', 'text-valign': 'top' },    // 31
        'E': { 'text-halign': 'left', 'text-valign': 'top' },    // 32
        'NONE': { 'text-halign': 'center', 'text-valign': 'top' },    // 33

        'N': { 'text-halign': 'center', 'text-valign': 'center' }, // 34
        'NE': { 'text-halign': 'left', 'text-valign': 'top' },    // 35
        'NW': { 'text-halign': 'right', 'text-valign': 'top' },    // 36

        'S': { 'text-halign': 'center', 'text-valign': 'top' },    // 37
        'SE': { 'text-halign': 'left', 'text-valign': 'top' },    // 38
        'SW': { 'text-halign': 'right', 'text-valign': 'top' },    // 39

        'W': { 'text-halign': 'right', 'text-valign': 'top' }     // 40
    },
    'NE': {
        'C': { 'text-halign': 'right', 'text-valign': 'top' },    // 41
        'E': { 'text-halign': 'center', 'text-valign': 'top' },    // 42
        'NONE': { 'text-halign': 'right', 'text-valign': 'top' },    // 43

        'N': { 'text-halign': 'right', 'text-valign': 'center' }, // 44
        'NE': { 'text-halign': 'center', 'text-valign': 'center' }, // 45
        'NW': { 'text-halign': 'right', 'text-valign': 'center' }, // 46

        'S': { 'text-halign': 'right', 'text-valign': 'top' },    // 47
        'SE': { 'text-halign': 'center', 'text-valign': 'top' },    // 48
        'SW': { 'text-halign': 'right', 'text-valign': 'top' },    // 49

        'W': { 'text-halign': 'right', 'text-valign': 'top' }     // 50
    },
    'NW': {
        'C': { 'text-halign': 'left', 'text-valign': 'top' },     // 51
        'E': { 'text-halign': 'left', 'text-valign': 'top' },     // 52
        'NONE': { 'text-halign': 'left', 'text-valign': 'top' },     // 53

        'N': { 'text-halign': 'left', 'text-valign': 'center' },  // 54
        'NE': { 'text-halign': 'left', 'text-valign': 'center' },  // 55
        'NW': { 'text-halign': 'center', 'text-valign': 'center' },  // 56

        'S': { 'text-halign': 'left', 'text-valign': 'top' },     // 57
        'SE': { 'text-halign': 'left', 'text-valign': 'top' },     // 58
        'SW': { 'text-halign': 'center', 'text-valign': 'top' },     // 59

        'W': { 'text-halign': 'center', 'text-valign': 'top' }      // 60
    },
    'S': {
        'C': { 'text-halign': 'center', 'text-valign': 'bottom' },  // 61
        'E': { 'text-halign': 'left', 'text-valign': 'bottom' },  // 62
        'NONE': { 'text-halign': 'center', 'text-valign': 'bottom' },  // 63

        'N': { 'text-halign': 'center', 'text-valign': 'bottom' },  // 64
        'NE': { 'text-halign': 'left', 'text-valign': 'bottom' },  // 65
        'NW': { 'text-halign': 'right', 'text-valign': 'bottom' },  // 66

        'S': { 'text-halign': 'center', 'text-valign': 'center' },  // 67
        'SE': { 'text-halign': 'left', 'text-valign': 'bottom' },  // 68
        'SW': { 'text-halign': 'right', 'text-valign': 'bottom' },  // 69

        'W': { 'text-halign': 'right', 'text-valign': 'bottom' }   // 70
    },
    'SE': {
        'C': { 'text-halign': 'right', 'text-valign': 'bottom' },  // 71
        'E': { 'text-halign': 'center', 'text-valign': 'bottom' },  // 72
        'NONE': { 'text-halign': 'right', 'text-valign': 'bottom' },  // 73

        'N': { 'text-halign': 'right', 'text-valign': 'bottom' },  // 74
        'NE': { 'text-halign': 'center', 'text-valign': 'bottom' },  // 75
        'NW': { 'text-halign': 'right', 'text-valign': 'bottom' },  // 76

        'S': { 'text-halign': 'right', 'text-valign': 'center' },  // 77
        'SE': { 'text-halign': 'center', 'text-valign': 'center' },  // 78
        'SW': { 'text-halign': 'right', 'text-valign': 'center' },  // 79

        'W': { 'text-halign': 'right', 'text-valign': 'bottom' }   // 80
    },
    'SW': {
        'C': { 'text-halign': 'left', 'text-valign': 'bottom' },    // 81
        'E': { 'text-halign': 'left', 'text-valign': 'bottom' },    // 82
        'NONE': { 'text-halign': 'left', 'text-valign': 'bottom' },    // 83

        'N': { 'text-halign': 'left', 'text-valign': 'bottom' },   // 84
        'NE': { 'text-halign': 'left', 'text-valign': 'bottom' },   // 85
        'NW': { 'text-halign': 'center', 'text-valign': 'bottom' },   // 86

        'S': { 'text-halign': 'left', 'text-valign': 'center' },   // 87
        'SE': { 'text-halign': 'left', 'text-valign': 'center' },   // 88
        'SW': { 'text-halign': 'center', 'text-valign': 'center' },   // 89

        'W': { 'text-halign': 'center', 'text-valign': 'bottom' }    // 90
    },
    'W': {
        'C': { 'text-halign': 'left', 'text-valign': 'center' },    // 91
        'E': { 'text-halign': 'left', 'text-valign': 'center' },    // 92
        'NONE': { 'text-halign': 'left', 'text-valign': 'center' },    // 93

        'N': { 'text-halign': 'left', 'text-valign': 'center' },   // 94
        'NE': { 'text-halign': 'left', 'text-valign': 'center' },   // 95
        'NW': { 'text-halign': 'center', 'text-valign': 'center' },   // 96

        'S': { 'text-halign': 'left', 'text-valign': 'center' },   // 97
        'SE': { 'text-halign': 'left', 'text-valign': 'center' },   // 98
        'SW': { 'text-halign': 'center', 'text-valign': 'center' },   // 99

        'W': { 'text-halign': 'center', 'text-valign': 'center' }   // 100
    }
};

const visualPropertyMap = {

    'NODE_FILL_COLOR': { 'att': 'background-color', 'type': 'color' },
    'NODE_TRANSPARENCY': { 'att': 'background-opacity', 'type': 'opacity' },
    'NODE_SHAPE': { 'att': 'shape', 'type': 'nodeShape' },
    'NODE_WIDTH': { 'att': 'width', 'type': 'number' },
    'NODE_HEIGHT': { 'att': 'height', 'type': 'number' },
    'NODE_BORDER_PAINT': { 'att': 'border-color', 'type': 'color' },
    'NODE_BORDER_TRANSPARENCY': { 'att': 'border-opacity', 'type': 'opacity' },
    'NODE_BORDER_WIDTH': { 'att': 'border-width', 'type': 'number' },
    'NODE_SIZE': [{ 'att': 'width', 'type': 'number' }, { 'att': 'height', 'type': 'number' }],

    'NODE_LABEL_FONT_FACE': { 'att': 'font-family', 'type': 'fontFamily' },

    'NODE_LABEL': { 'att': 'content', 'type': 'string' },
    'NODE_LABEL_COLOR': { 'att': 'color', 'type': 'color' },
    'NODE_LABEL_FONT_SIZE': { 'att': 'font-size', 'type': 'number' },
    'NODE_LABEL_TRANSPARENCY': { 'att': 'text-opacity', 'type': 'opacity' },
    'NODE_LABEL_POSITION': { 'att': 'labelPosition', 'type': 'labelPosition' },

    'EDGE_WIDTH': { 'att': 'width', 'type': 'number' },
    'EDGE_LABEL': { 'att': 'label', 'type': 'string' },
    'EDGE_LABEL_COLOR': { 'att': 'color', 'type': 'color' },
    'EDGE_LABEL_FONT_SIZE': { 'att': 'font-size', 'type': 'number' },
    'EDGE_LABEL_FONT_FACE': { 'att': 'font-family', 'type': 'fontFamily' },
    'EDGE_LABEL_TRANSPARENCY': { 'att': 'text-opacity', 'type': 'opacity' },
    'EDGE_LINE_TYPE': { 'att': 'line-style', 'type': 'line' },
    'EDGE_STROKE_UNSELECTED_PAINT': { 'att': 'line-color', 'type': 'color' },
    'EDGE_UNSELECTED_PAINT': { 'att': 'line-color', 'type': 'color' },
    'EDGE_TRANSPARENCY': { 'att': 'opacity', 'type': 'opacity' },
    'EDGE_SOURCE_ARROW_SHAPE': { 'att': 'source-arrow-shape', 'type': 'arrow' },
    'EDGE_TARGET_ARROW_SHAPE': { 'att': 'target-arrow-shape', 'type': 'arrow' },
    'EDGE_TARGET_ARROW_UNSELECTED_PAINT': { 'att': 'target-arrow-color', 'type': 'color' },
    'EDGE_SOURCE_ARROW_UNSELECTED_PAINT': { 'att': 'source-arrow-color', 'type': 'color' }
};

const JAVA_LOGICAL_FONT_PROPERTIES_MAP = {
    'Dialog.plain': {},
    'Dialog.bold': {'font-weight': 'bold'},
    'Dialog.bolditalic': {'font-weight': 'bold', 'font-style': 'italic'},
    'Dialog.italic':{'font-style': 'italic'},

    //DialogInput
    'DialogInput.plain':{},
    'DialogInput.bold':{'font-weight': 'bold'},
    'DialogInput.bolditalic':{'font-weight': 'bold', 'font-style': 'italic'},
    'DialogInput.italic':{'font-style': 'italic'},    

    //Monospaced
    'Monospaced.plain':{},
    'Monospaced.bold':{'font-weight': 'bold'},
    'Monospaced.bolditalic':{'font-weight': 'bold', 'font-style': 'italic'},
    'Monospaced.italic':{'font-style': 'italic'},

    //Serif
    'Serif.plain':{},
    'Serif.bold':{'font-weight': 'bold'},
    'Serif.bolditalic':{'font-weight': 'bold', 'font-style': 'italic'},
    'Serif.italic':{'font-style': 'italic'},

    //SansSerif
    'SansSerif.plain':{},
    'SansSerif.bold':{'font-weight': 'bold'},
    'SansSerif.bolditalic':{'font-weight': 'bold', 'font-style': 'italic'},
    'SansSerif.italic':{'font-style': 'italic'}
};

const JAVA_FONT_STYLE_CSS_MAP = {
    'PLAIN' : {},
    'BOLD': {'font-weight': 'bold'},
    'BOLDITALIC': {'font-weight': 'bold', 'font-style': 'italic'},
    'ITALIC': {'font-style': 'italic'}
};

const FONT_FAMILY_MAP = {
    // https://www.cssfontstack.com/

    // Sans-serif font stack
    'Arial': 'Arial,Helvetica Neue,Helvetica,sans-serif',
    'Arial-Black': 'Arial Black,Arial Bold,Gadget,sans-serif',
    'ArialMT':'Arial,Helvetica Neue,Helvetica,sans-serif',
    'ArialNarrow': 'Arial Narrow,Arial,sans-serif',
    'ArialRoundedMTBold': 'Arial Rounded MT Bold,Helvetica Rounded,Arial,sans-serif',

    'AvantGarde': 'Avant Garde,Avantgarde,Century Gothic,CenturyGothic,AppleGothic,sans-serif',
    'Calibri': 'Calibri,Candara,Segoe,Segoe UI,Optima,Arial,sans-serif',
    'Candara': 'Candara,Calibri,Segoe,Segoe UI,Optima,Arial,sans-serif',
    'CenturyGothic': 'Century Gothic,CenturyGothic,AppleGothic,sans-serif',

    'FranklinGothic-Medium': 'Franklin Gothic Medium,Franklin Gothic,ITC Franklin Gothic,Arial,sans-serif',
    'Futura': 'Futura,Trebuchet MS,Arial,sans-serif',
    'Geneva': 'Geneva,Tahoma,Verdana,sans-serifcxToJs',
    'GillSans': 'Gill Sans,Gill Sans MT,Calibri,sans-serif',

    'HelveticaNeue': 'Helvetica Neue,Helvetica,Arial,sans-serif',
    'Impact': 'Impact,Haettenschweiler,Franklin Gothic Bold,Charcoal,Helvetica Inserat,Bitstream Vera Sans Bold,Arial Black,sans-serif',
    'LucidaGrande': 'Lucida Grande,Lucida Sans Unicode,Lucida Sans,Geneva,Verdana,sans-serif',
    'Optima': 'Optima,Segoe,Segoe UI,Candara,Calibri,Arial,sans-serif',

    'Segoe UI': 'Segoe UI,Frutiger,Frutiger Linotype,Dejavu Sans,Helvetica Neue,Arial,sans-serif',
    'SegoeUI': 'Segoe UI,Frutiger,Frutiger Linotype,Dejavu Sans,Helvetica Neue,Arial,sans-serif',
    'Tahoma': 'Tahoma,Verdana,Segoe,sans-serif',
    'TrebuchetMS': 'Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif',
    'Verdana': 'Verdana,Geneva,sans-serif',

    // Serif font stack
    'BigCaslon': 'Big Caslon,Book Antiqua,Palatino Linotype,Georgia,serif',
    'BodoniMT': 'Bodoni MT,Didot,Didot LT STD,Hoefler Text,Garamond,Times New Roman,serif',
    'BookAntiqua': 'Book Antiqua,Palatino,Palatino Linotype,Palatino LT STD,Georgia,serif',
    'CalistoMT': 'Calisto MT,Bookman Old Style,Bookman,Goudy Old Style,Garamond,Hoefler Text,Bitstream Charter,Georgia,serif',

    'Cambria': 'Cambria,Georgia,serif',
    'Didot': 'Didot,Didot LT STD,Hoefler Text,Garamond,Times New Roman,serif',
    'Garamond': 'Garamond,Baskerville,Baskerville Old Face,Hoefler Text,Times New Roman,serif',
    'Georgia': 'Georgia,Times,Times New Roman,serif',

    'GoudyOldStyle': 'Goudy Old Style,Garamond,Big Caslon,Times New Roman,serif',
    'HoeflerText': 'Hoefler Text,Baskerville Old Face,Garamond,Times New Roman,serif',
    'LucidaBright': 'Lucida Bright,Georgia,serif',
    'Palatino': 'Palatino,Palatino Linotype,Palatino LT STD,Book Antiqua,Georgia,serif',

    'Perpetua': 'Perpetua,Baskerville,Big Caslon,Palatino Linotype,Palatino,URW Palladio L,Nimbus Roman No9 L,serif',
    'Rockwell': 'Rockwell,Courier Bold,Courier,Georgia,Times,Times New Roman,serif',
    'Rockwell-ExtraBold': 'Rockwell Extra Bold,Rockwell Bold,monospace,serif',
    'Baskerville': 'Baskerville,Baskerville Old Face,Hoefler Text,Garamond,Times New Roman,serif',

    'TimesNewRoman': 'TimesNewRoman,Times New Roman,Times,Baskerville,Georgia,serif',

    // Monospaced font stack
    'Consolas': 'Consolas,monaco,monospace',
    'CourierNew': 'Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace',
    'LucidaConsole': 'Lucida Console,Lucida Sans Typewriter,monaco,Bitstream Vera Sans Mono,monospace',
    'LucidaSans-Typewriter': 'Lucida Sans Typewriter,Lucida Console,monaco,Bitstream Vera Sans Mono,monospace',
    'Monaco': 'monaco,Consolas,Lucida Console,monospace',
    'AndaleMono': 'Andale Mono,AndaleMono,monospace',

    // Fantasy font stack
    'Copperplate': 'Copperplate,Copperplate Gothic Light,fantasy',
    'Papyrus': 'Papyrus,fantasy',

    // Script font stack
    'BrushScriptMT': 'Brush Script MT,cursive',

    
    //Java Logical Font stack
    //The following are Java logical fonts. 
    //https://docs.oracle.com/javase/tutorial/2d/text/fonts.html#logical-fonts 
    
    //Dialog
    'Dialog.plain': 'Segoe UI,Frutiger,Frutiger Linotype,Dejavu Sans,Helvetica Neue,Arial,sans-serif',
    'Dialog.bold':'Segoe UI,Frutiger,Frutiger Linotype,Dejavu Sans,Helvetica Neue,Arial,sans-serif',
    'Dialog.bolditalic':'Segoe UI,Frutiger,Frutiger Linotype,Dejavu Sans,Helvetica Neue,Arial,sans-serif',
    'Dialog.italic':'Segoe UI,Frutiger,Frutiger Linotype,Dejavu Sans,Helvetica Neue,Arial,sans-serif',

    //DialogInput
    'DialogInput.plain':'Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace',
    'DialogInput.bold':'Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace',
    'DialogInput.bolditalic':'Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace',
    'DialogInput.italic':'Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace',    

    //Monospaced
    'Monospaced.plain':'Consolas,monaco,monospace',
    'Monospaced.bold':'Consolas,monaco,monospace',
    'Monospaced.bolditalic':'Consolas,monaco,monospace',
    'Monospaced.italic':'Consolas,monaco,monospace',

    //Serif
    'Serif.plain':'TimesNewRoman,Times New Roman,Times,Baskerville,Georgia,serif',
    'Serif.bold':'TimesNewRoman,Times New Roman,Times,Baskerville,Georgia,serif',
    'Serif.bolditalic':'TimesNewRoman,Times New Roman,Times,Baskerville,Georgia,serif',
    'Serif.italic':'TimesNewRoman,Times New Roman,Times,Baskerville,Georgia,serif',

    //SansSerif
    'SansSerif.plain':'Arial,Helvetica Neue,Helvetica,sans-serif',
    'SansSerif.bold':'Arial,Helvetica Neue,Helvetica,sans-serif',
    'SansSerif.bolditalic':'Arial,Helvetica Neue,Helvetica,sans-serif',
    'SansSerif.italic':'Arial,Helvetica Neue,Helvetica,sans-serif'
};

class CxToJs {

    constructor(cxNetworkUtils) {
        this.cxNetworkUtils = cxNetworkUtils;

        // The attributeNameMap maps attribute names in niceCX to attribute names in cyjs.
        // In some cases, such as 'id', 'source', and 'target', cyjs uses reserved names and
        // any attribute names that conflict must be mapped.
        var self = this;

        this.specialCaseAttributeMap = {
            'id': 'cx_id',
            'target': 'cx_target',
            'source': 'cx_source',
            'shared name': 'name',
            'shared interaction': 'interaction'
        };

        this.shapeFunctions = {
            'RECTANGLE' : function (shapeMap, ctx) {
                ctx.rect(shapeMap['x'],shapeMap['y'],shapeMap['width'],shapeMap['height']);               
            }
        };

        this.getCyAttributeName = function (attributeName, attributeNameMap) {

            var cyAttributeName = attributeNameMap[attributeName];

            if (!cyAttributeName) {
                cyAttributeName = self.specialCaseAttributeMap[attributeName];
                if (cyAttributeName) {
                    return cyAttributeName;
                }

                attributeNameMap[attributeName] = attributeName; // direct mapping
                cyAttributeName = attributeName;
            }

            return cyAttributeName;
        };

        this.sanitizeAttributeNameMap = function (attributeNameMap) {
            var attributeNames = Object.keys(attributeNameMap);
            var uniqueCounter = 1;
            attributeNames.forEach(function (attributeName) {
                // handle attribute names that conflict with reserved names used by cyjs
                var specialCaseName = self.specialCaseAttributeMap[attributeName];
                if (specialCaseName) {
                    attributeNameMap[attributeName] = specialCaseName;
                } else if (/^[A-Za-z][A-Za-z0-9]*$/.test(attributeName)) { // name is ok
                    attributeNameMap[attributeName] = attributeName;
                } else {
                    // We will map the name to a modified name
                    // cyjs requires that attribute names avoid special characters, so names with
                    // special characters must be transformed and mapped.
                    // `^[^a-zA-Z_]+|[^a-zA-Z_0-9]+

                    var nonAlpha = attributeName.replace(/^[^a-zA-Z_]+|[^a-zA-Z_0-9]+/gi, '_');
                    nonAlpha = nonAlpha + '_u' + uniqueCounter;
                    uniqueCounter = uniqueCounter + 1;
                    attributeNameMap[attributeName] = nonAlpha;
                }

            });

        };

        /*
         * Get the first element from the list of elements.  Attributes of node or edge of this first element will be
         * used to style the node/edge.  This behavior simulates the behavior of Cytoscape:
         *
         * if a node column has the type "list of ... (strings/numbers/booleans), then cytoscape uses the first element
         * in the list to style the node (or edge).
         * For example, if a column has the type ['protein', 'gene'] (list of strings), then Cytoscape uses the shape of
         * 'protein' (the first element in the list) to draw this node (the shape of 'protein' in Cytoscape is 'round rectangle').
         * If, however, a node has the list ['gene', 'protein'], then Cytoscape uses the shape of
         * 'gene' (shape of 'gene' is 'diamond') to draw this node.
         */
        this.getFirstElementFromList = function (attributeObj) {

            var type = (attributeObj && attributeObj.d) ? attributeObj.d : 'list_of_string';
            var attrValue = (attributeObj && attributeObj.v && attributeObj.v[0]) ? attributeObj.v[0] : '';
            var retValue;

            if (type === 'list_of_string' || type === 'list_of_boolean') {
                retValue = attrValue;

                /*   } else if (type == 'list_of_boolean') {
                       // N.B.: for list of booleans, we take the first value and return it as
                       // a String ('true' or 'false'), and not as an actual Boolean (true or false),
                       // since Cytoscape.js expects 'true' or 'false'.
                       retValue = (attrValue.toLowerCase() === 'true'); //attrValue;
           */
            } else {
                // this is a numeric type, one of CX_NUMBER_DATATYPES
                retValue = parseFloat(attrValue);
            }

            return retValue;
        };

        this.cyColorFromCX = function (hex) {
            hex = hex.replace('#', '');
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);

            return 'rgb(' + r + ',' + g + ',' + b + ')';
        };

        this.cyNumberFromString = function (string) {
            return parseFloat(string);
        };

        // Opacity conversion
        // convert from 0-255 to 0-1.
        this.cyOpacityFromCX = function (string) {
            var trans = parseInt(string);
            return trans / 255.0;
        };


        /*
         * The code for this function is adjusted from commaDelimitedListStringToStringList2 method from
         * https://github.com/ndexbio/ndex-cytoscape-app/blob/master/src/main/java/org/cytoscape/ndex/internal/cx_reader/StringParser.java
         *
         * The purpose is to correctly split a string of params into a list of tokens in case
         * the string contains comma(s) as part of names or values. Two commas in a row (,,) are
         * interpreted as a comma-escaped comma.
         *
         * For example, given the string
         *      list = "COL=name,T=string,K=0=Node=1,V=0=#00FF99,K=1=Node,,2,V=1=#CC0099"
         *
         * this function correctly interprets the two commas as one comma escaped by another comma in
         * the "K=1=Node,,2" and returns the following array of lists to the caller
         *
         *          result = Array[6]
         *              0 = "COL=name"
         *              1 = "T=string"
         *              2 = "K=0=Node=1"
         *              3 = "V=0=#00FF99"
         *              4 = "K=1=Node,2"
         *              5 = "V=1=#CC0099"
         */
        this.commaDelimitedListStringToStringList2 = function (list) {

            //var mapping = {};
            //var def = {m: mapping};

            var result = [];

            //var objs = list.match(/(?<=(^|,))([^,]|,,)*(?=(,|$))/g);

            var objs = list.match(/(^|,)([^,]|,,)*/g);

            objs.forEach(function (entry) {
                if (entry.startsWith(',')) {
                    entry = entry.replace(',', '');
                }
                result.push(entry.replace(/,,/g, ','));
            });

            return result;
        };



        // "COL=interaction,T=string,K=0=binds,V=0=#3300FF,K=1=isa,V=1=#FF0000"
        // "COL=interaction,T=string,K=0=binds,V=0=NONE,K=1=isa,V=1=ARROW"
        // "COL=weight,T=double,L=0=1.0,E=0=1.0,G=0=1.0,OV=0=0.0,L=1=8.0,E=1=8.0,G=1=1.0,OV=1=70.0"
        var commaDelimitedListStringToStringList2 = this.commaDelimitedListStringToStringList2;
        this.parseMappingDefinition = function (definition) {
            var items = commaDelimitedListStringToStringList2(definition); //definition.split(',');
            items = items || [];
            var mapping = {};
            var def = { m: mapping };

            /*
            _.forEach(items, function (item) {
                item = item.trim();
                var vals = item.split('=');  //item.match(/('[^']+'|[^=]+)/g);
                var v0 = vals[0];
                var v1 = vals[1];
  
                if (vals.length > 2) {
                    var v2 = vals[2];
                    var m = mapping[v1];
                    if (!m) {
                        m = {};
                        mapping[v1] = m;
                    }
                    m[v0] = v2;
                } else {
                    def[v0] = v1;
                }
            });
            */


            _.forEach(items, function (item) {
                item = item.trim();

                var vals = item.split('=');

                var v0 = vals[0];
                var v1 = vals[1];

                if (vals.length > 2) {

                    /*
                     * the regex item.match(/^((K|V|L|E|G|OV)=([0-9]+))=(.*)$/); is taken from StringParser method from
                     * https://github.com/ndexbio/ndex-cytoscape-app/blob/master/src/main/java/org/cytoscape/ndex/internal/cx_reader/StringParser.java
                     * If key or value contains the Equal sign in it (i.e., K=0=Node=1, where Node=1 is actually a name of the key),
                     * this Equal sign will be correctly interpreted as part of the name.
                     * Thus, the following definition argument "COL=name,T=string,K=0=Node=1,V=0=#00FF99,K=1=Node,,2,V=1=#CC0099"
                     * passed to this function will be correctly parsed into the following def structure:
                     *
                     *     def = Object
                     *              COL = "name"
                     *              T   = "string"
                     *              m   = Object
                     *                 0  =  Object
                     *                    K = "Node=1"
                     *                    V = "#00FF99"
                     *                 1  =  Object
                     *                    K = "Node,2"
                     *                    V = "#CC0099"
                     */

                    vals = item.match(/^((K|V|L|E|G|OV)=([0-9]+))=(.*)$/);

                    v0 = vals[2];
                    v1 = vals[3];

                    var v2 = vals[4];
                    var m = mapping[v1];
                    if (!m) {
                        m = {};
                        mapping[v1] = m;
                    }
                    m[v0] = v2;
                } else {
                    def[v0] = v1;
                }
            });

            return def;
        };

        /*
         * This function gets a string with 5 Cytoscape Node Label coordinates in the form
         *
         *  <Node Anchor>, <Label Anchor>, <Label Justification>, <X Offset>, <Y Offset>
         *
         *  where
         *
         *     <Node Anchor>         - one of the values from VALID_NODE_LABEL_POSITIONS
         *     <Label Anchor>        - one of the values from VALID_NODE_LABEL_POSITIONS
         *     <Label Justification> - one of the values: l, c, or r (for 'left', 'center' or 'right', respectively)
         *     <X Offset>            - float number (negative or positive)
         *     <Y Offset>            - float number (negative or positive)
         *
         *  example of cyLabelCoordinates: 'N,SW,c,0.00,0.00'
         *
         *  As of 9 May 2018, we only support/process/(extract from cyLabelCoordinates) <Node Anchor> and <Label Anchor>.
         *
         *  The function returns a javascript map with Javascript.js Node Label coordinates in the form
         *
         *      {
         *          'text-halign' : <halign>,   // halign is in ['left', 'center', 'right']
         *          'text-valign' : <valign>    // valign is in ['top',  'center', 'bottom']
         *      }
         *
         */

        this.getNodeLabelPosition = function (cyLabelCoordinates) {
            var position = {
                'text-halign': 'center',
                'text-valign': 'center'
            };

            if (!cyLabelCoordinates) {
                return position;
            }

            var cyLabelCoordinatesArray = cyLabelCoordinates.split(',');

            if (cyLabelCoordinatesArray.length >= 2) {

                var nodeAnchorCoordinate = cyLabelCoordinatesArray[0];
                var labelAnchorCoordinate = cyLabelCoordinatesArray[1];

                if (nodeAnchorCoordinate) {
                    nodeAnchorCoordinate = nodeAnchorCoordinate.toUpperCase();
                }
                if (labelAnchorCoordinate) {
                    labelAnchorCoordinate = labelAnchorCoordinate.toUpperCase();
                }
                if (!(nodeAnchorCoordinate in VALID_NODE_LABEL_POSITIONS)) {
                    nodeAnchorCoordinate = 'C';
                }
                if (!(labelAnchorCoordinate in VALID_NODE_LABEL_POSITIONS)) {
                    labelAnchorCoordinate = 'C';
                }

                position =
                    CYTOSCAPE_TO_JS_NODE_LABEL_COORDINATES[nodeAnchorCoordinate][labelAnchorCoordinate];
            }

            return position;
        };

        this.getCyVisualAttributeForVP = function (vp) {
            var attProps = visualPropertyMap[vp];
            if (attProps) {
                return attProps.att;
            }
            return false;
        };

        this.getCyVisualAttributeObjForVP = function (vp) {
            var attProps = visualPropertyMap[vp];
            if (attProps) {
                return attProps;
            }
            return false;
        };

        this.getCyVisualAttributeTypeForVp = function (vp) {
            var attProps = visualPropertyMap[vp];
            return attProps.type;
        };

        //var cyNumberFromString = this.cyNumberFromString
        //var cyColorFromCX = this.cyColorFromCX
        // var cyOpacityFromCX = this.cyOpacityFromCX
        this.getCyVisualAttributeValue = function (visualAttributeValue, cyVisualAttributeType) {
            if (cyVisualAttributeType === 'number') {
                return self.cyNumberFromString(visualAttributeValue);
            } else if (cyVisualAttributeType === 'color') {
                return self.cyColorFromCX(visualAttributeValue);
            } else if (cyVisualAttributeType === 'opacity') {
                return self.cyOpacityFromCX(visualAttributeValue);
            } else if (cyVisualAttributeType === 'nodeShape') {
                var shapeValue = NODE_SHAPE_MAP[visualAttributeValue];
                if (shapeValue) {
                    return shapeValue;
                }
            } else if (cyVisualAttributeType === 'arrow') {
                //console.log(visualAttributeValue);
                var arrowValue = ARROW_SHAPE_MAP[visualAttributeValue];
                if (arrowValue) {
                    return arrowValue;
                }
            } else if (cyVisualAttributeType === 'line') {
                var lineValue = LINE_STYLE_MAP[visualAttributeValue];
                if (lineValue) {
                    return lineValue;
                }
            } else if (cyVisualAttributeType === 'labelPosition') {
                return self.getNodeLabelPosition(visualAttributeValue);
            }
            // assume string
            return visualAttributeValue;
        };

        //var getCyVisualAttributeForVP = self.getCyVisualAttributeForVP
        this.discreteMappingStyle = function (elementType, vp, def, attributeNameMap) {
            //console.log(def);
            // def is the discreteMappingStyle definition
            var elements = [];
            var cyVisualAttribute = self.getCyVisualAttributeForVP(vp);
            if (!cyVisualAttribute) {
                //console.log('no visual attribute for ' + vp)
                return elements;  // empty result, vp not handled
            }

            var cyVisualAttributeType = self.getCyVisualAttributeTypeForVp(vp);

            // the cytoscape column is mapped to the cyjs attribute name
            var cyDataAttribute = self.getCyAttributeName(def.COL, attributeNameMap);

            var colDataType = def.T;

            //    var regExToCheckIfIntNumber   = /^-{0,1}\d+$/;
            //    var regExToCheckIfFloatNumber = /^-{0,1}\d+\.\d*$/;

            _.forEach(def.m, function (pair) {
                var cyDataAttributeValue = pair.K;
                var visualAttributeValue = pair.V;
                var cyVisualAttributeValue = self.getCyVisualAttributeValue(visualAttributeValue, cyVisualAttributeType);
                // check if cyDataAttributeValue is a valid number (float or integer)
                //      var isValidNumber =
                //          regExToCheckIfIntNumber.test(cyDataAttributeValue) ||
                //          regExToCheckIfFloatNumber.test(cyDataAttributeValue);

                var cySelector = colDataType !== 'string' && colDataType !== 'boolean' ?
                    elementType + '[' + cyDataAttribute + ' = ' + cyDataAttributeValue + ']' :
                    elementType + '[' + cyDataAttribute + ' = \'' + cyDataAttributeValue + '\']';

                var cyVisualAttributePair = {};
                if (cyVisualAttribute !== 'labelPosition') {
                    cyVisualAttributePair[cyVisualAttribute] = cyVisualAttributeValue;
                } else {
                    // cyVisualAttribute is 'labelPosition'
                    cyVisualAttributePair['text-halign'] = cyVisualAttributeValue['text-halign'];
                    cyVisualAttributePair['text-valign'] = cyVisualAttributeValue['text-valign'];
                }
                var element = { 'selector': cySelector, 'css': cyVisualAttributePair };
                //console.log(element);
                elements.push(element);
            });
            return elements;
        };

        this.continuousMappingStyleAux = function (cyVisualAttribute, cyVisualAttributeType, elementType, def, cyDataAttribute, elements) {
            var lastPointIndex = Object.keys(def.m).length - 1;

            // Each Continuous Mapping Point in def.m has 4 entries:
            // L - Lesser Visual Attribute Value
            // E - Equal Visual Attribute Value
            // G - Greater Visual Attribute Value
            // OV - Mapped Data Value

            var previousTranslatedPoint = null;

            //            console.log('m =' + JSON.stringify(def.m) );

            _.forEach(def.m, function (point, index) {

                var translatedPoint = {
                    lesserValue: self.getCyVisualAttributeValue(point.L, cyVisualAttributeType),
                    equalValue: self.getCyVisualAttributeValue(point.E, cyVisualAttributeType),
                    greaterValue: self.getCyVisualAttributeValue(point.G, cyVisualAttributeType),
                    mappedDataValue: self.cyNumberFromString(point.OV)
                };

                var lesserSelector = null;
                var lesserCSS = {};

                var equalSelector = null;
                var equalCSS = {};

                var middleSelector = null;
                var middleCSS = {};

                var greaterSelector = null;
                var greaterCSS = {};

                //                console.log('tp = ' + JSON.stringify(translatedPoint));
                //                console.log('ptp = ' + JSON.stringify(previousTranslatedPoint));

                var i = parseInt(index);

                if (i === 0) {
                    // first Continuous Mapping point in sequence
                    // output a style for values less than the point
                    lesserSelector = elementType + '[' + cyDataAttribute + ' < ' + translatedPoint.mappedDataValue + ']';
                    lesserCSS[cyVisualAttribute] = translatedPoint.lesserValue;
                    elements.push({ 'selector': lesserSelector, 'css': lesserCSS });

                    // output a style for values equal to the point
                    equalSelector = elementType + '[' + cyDataAttribute + ' = ' + translatedPoint.mappedDataValue + ']';
                    equalCSS[cyVisualAttribute] = translatedPoint.equalValue;
                    elements.push({ 'selector': equalSelector, 'css': equalCSS });

                    // set the previous point values to use when processing the next point
                    previousTranslatedPoint = translatedPoint;

                } else {
                    // intermediate or final Continuous Mapping point in sequence
                    // output a style for the range between the previous point and this point
                    // "selector": "edge[weight > 0][weight < 70]"
                    middleSelector = elementType + '[' + cyDataAttribute + ' > ' + previousTranslatedPoint.mappedDataValue + ']' + '[' + cyDataAttribute + ' < ' + translatedPoint.mappedDataValue + ']';

                    //"width": "mapData(weight,0,70,1.0,8.0)"
                    if (previousTranslatedPoint.equalValue === translatedPoint.equalValue) {
                        // here, if previousTranslatedPoint.equalValue and translatedPoint.equalValue are same,
                        // then Cytoscape.js' mapData() fails to correctly set the values, for example,
                        // if previousTranslatedPoint.equalValue ===  translatedPoint.equalValue ===  rgb(255,255,0),
                        // then mapData() of Cytoscape.js incorrectly sets the color to gray instead of rgb(255,255,0) yellow.
                        // A bug for Cytoscape.js has been filed: https://github.com/cytoscape/cytoscape.js/issues/2152

                        // this is a workaround to resolve https://ndexbio.atlassian.net/browse/NWA-267
                        // Translation of continuous mapping style problems.

                        middleCSS[cyVisualAttribute] = previousTranslatedPoint.equalValue;
                    } else {
                        middleCSS[cyVisualAttribute] = 'mapData(' + cyDataAttribute + ',' +
                            previousTranslatedPoint.mappedDataValue + ',' + translatedPoint.mappedDataValue + ',' +
                            previousTranslatedPoint.equalValue + ',' + translatedPoint.equalValue + ')';
                    }
                    elements.push({ 'selector': middleSelector, 'css': middleCSS });

                    // output a style for values equal to this point
                    equalSelector = elementType + '[' + cyDataAttribute + ' = ' + translatedPoint.mappedDataValue + ']';
                    equalCSS[cyVisualAttribute] = translatedPoint.equalValue;
                    elements.push({ 'selector': equalSelector, 'css': equalCSS });

                    // if this is the last point, output a style for values greater than this point
                    if (i === lastPointIndex) {

                        greaterSelector = elementType + '[' + cyDataAttribute + ' > ' + translatedPoint.mappedDataValue + ']';
                        greaterCSS[cyVisualAttribute] = translatedPoint.equalValue;
                        elements.push({ 'selector': greaterSelector, 'css': greaterCSS });
                    }

                    // set the previous point to this point for the next iteration
                    previousTranslatedPoint = translatedPoint;
                }
            });

        };

        this.continuousMappingStyle = function (elementType, vp, def, attributeNameMap) {
            var elements = [];
            var cyVisualAttributeObj = self.getCyVisualAttributeObjForVP(vp); //getCyVisualAttributeForVP(vp);
            if (!cyVisualAttributeObj) {
                //console.log('no visual attribute for ' + vp)
                return elements;  // empty result, vp not handled
            }
            var ll = Object.prototype.toString.call(cyVisualAttributeObj);
            if (ll !== '[object Array]') {
                cyVisualAttributeObj = [cyVisualAttributeObj];
            }

            var cyDataAttribute = self.getCyAttributeName(def.COL, attributeNameMap);

            _.forEach(cyVisualAttributeObj, function (vAttr) {
                var cyVisualAttribute = vAttr.att;
                var cyVisualAttributeType = vAttr.type;
                self.continuousMappingStyleAux(cyVisualAttribute, cyVisualAttributeType, elementType, def, cyDataAttribute, elements);

            });

            return elements;
        };

        this.passthroughMappingStyle = function (elementType, vp, def, attributeNameMap) {
            var elements = [];
            var cyVisualAttribute = self.getCyVisualAttributeForVP(vp);
            if (!cyVisualAttribute) {
                //console.log('no visual attribute for ' + vp)
                return elements;  // empty result, vp not handled
            }

            // the cytoscape column is mapped to the cyjs attribute name
            var cyDataAttribute = self.getCyAttributeName(def.COL, attributeNameMap);

            var properties = {};
            properties[cyVisualAttribute] = 'data(' + cyDataAttribute + ')';
            var style = { 'selector': elementType + '[' + cyDataAttribute + ']', 'css': properties };
            elements.push(style);
            return elements;
        };

        //var parseMappingDefinition = this.parseMappingDefinition
        // var discreteMappingStyle = this.discreteMappingStyle
        // var continuousMappingStyle = this.continuousMappingStyle
        // var passthroughMappingStyle = this.passthroughMappingStyle
        this.mappingStyle = function (elementType, vp, type, definition, attributeNameMap) {
            var def = self.parseMappingDefinition(definition);
            if (type === 'DISCRETE') {
                return self.discreteMappingStyle(elementType, vp, def, attributeNameMap);
            } else if (type === 'CONTINUOUS') {
                return self.continuousMappingStyle(elementType, vp, def, attributeNameMap);
            } else if (type === 'PASSTHROUGH') {
                return self.passthroughMappingStyle(elementType, vp, def, attributeNameMap);
            }
        };

        this.expandLabelPosition = function(cyLabelPosition, objectProperties) {
            var labelPosition = self.getNodeLabelPosition(cyLabelPosition);

            objectProperties['text-valign'] = labelPosition['text-valign'];
            objectProperties['text-halign'] = labelPosition['text-halign']; 
        };

        this.expandFontProperties = function(labelFontFace, objectProperties) {
            var font = labelFontFace.split(',');
            //defaultNodeProperties['font-family'] = font[0];
                                       
            if (font[0] in JAVA_LOGICAL_FONT_PROPERTIES_MAP) {
                var logicalFontProperties = JAVA_LOGICAL_FONT_PROPERTIES_MAP[font[0]];
                _.forEach(logicalFontProperties, function(propertyValue, propertyKey) {
                    objectProperties[propertyKey] = propertyValue;
                });
            } else {
                if (font[1].toUpperCase in JAVA_FONT_STYLE_CSS_MAP) {
                    var fontProperties = JAVA_FONT_STYLE_CSS_MAP[font[1].toUpperCase];
                    _.forEach(fontProperties, function(propertyValue, propertyKey) {
                        objectProperties[propertyKey] = propertyValue;
                    });}
            }
            if (font[0] in FONT_FAMILY_MAP) {
                objectProperties['font-family'] = FONT_FAMILY_MAP[font[0]];
            } else {
                objectProperties['font-family'] = 'sans-serif';
                objectProperties['font-weight'] = 'normal';
            }
            objectProperties['font-size'] = font[font.length-1];
        };

        this.cyVisualPropertyFromNiceCX= function(niceCX, type, vp) {
            //console.log(niceCX);
            var result = null;
            var visualProps;
            /** @namespace niceCX.cyVisualProperties **/
            if (niceCX.cyVisualProperties) {
                visualProps = niceCX.cyVisualProperties;
            }
            else {
                /** @namespace niceCX.visualProperties **/
                if (niceCX.visualProperties) {
                    visualProps = niceCX.visualProperties;
                } else {
                    return null;
                }
            }

            _.forEach(visualProps, function (vpAspectElement) {
                _.forEach(vpAspectElement, function (vpElement) {
                    /** @namespace vpElement.properties_of **/
                    var elementType = vpElement.properties_of;
                    if (elementType === type) {
                        /** @namespace vpElement.properties.NETWORK_SCALE_FACTOR **/
                        result = vpElement.properties[vp];
                        return false;
                    }
                });
            });

            return result;
        };

        this._colorFromInt= function (num, alpha) {
            num >>>= 0;
            var b = num & 0xFF,
                g = (num & 0xFF00) >>> 8,
                r = (num & 0xFF0000) >>> 16,
                a = parseFloat(alpha) / 100;
              
            return "rgb(" + r + "," + g + "," +b +"," + a + ")";
        };
    }

    

    // Public API here: the factory object will be returned

    //var cy;
    // var selectionContainer = {};

    // Original position will be used when layout positions are available
    //const DEF_LAYOUT = 'preset';

    // Layout to be used when there is no layout information
    //const DEF_NO_LAYOUT = 'cose';

    getDefaultStyle() {
        return DEF_VISUAL_STYLE;
    }

    cyElementsFromNiceCX(niceCX, attributeNameMap) {

        var elements = {};

        var nodeList = [];
        var nodeMap = {};
        var edgeList = [];
        var edgeMap = {};

        elements.nodes = nodeList;
        elements.edges = edgeList;

        var cxNodeAttributes = this.cxNetworkUtils.getNodeAttributes(niceCX);
        var getCyAttributeName = this.getCyAttributeName;
        if (cxNodeAttributes) {
            // for each node id
            _.forEach(cxNodeAttributes, function (nodeAttributeMap) {
                _.forEach(nodeAttributeMap, function (attributeObject, attributeName) {
                    getCyAttributeName(attributeName, attributeNameMap);
                });
            });
        }

        //            sanitizeAttributeNameMap(attributeNameMap);

        var edgeAttributes = this.cxNetworkUtils.getEdgeAttributes(niceCX);
        if (edgeAttributes) {
            _.forEach(edgeAttributes, function (edgeAttributeMap) {
                _.forEach(edgeAttributeMap, function (attributeObject, attributeName) {
                    getCyAttributeName(attributeName, attributeNameMap);
                });
            });
        }

        this.sanitizeAttributeNameMap(attributeNameMap);

        // handle node aspect
        var cxNodes = this.cxNetworkUtils.getNodes(niceCX);
        var cxNetworkUtils = this.cxNetworkUtils;
        if (cxNodes) {
            _.forEach(cxNodes, function (nodeElement) {
                var cxNodeId = nodeElement['@id'];
                var nodeData = { 'id': cxNodeId };

                nodeData.name = cxNetworkUtils.getDefaultNodeLabel(niceCX, nodeElement);
                /*if (nodeElement.n) {
                    nodeData.name = nodeElement.n;
                } else if (nodeElement.represents) {
                    nodeData.represents = nodeElement.represents;
                } else if ( niceCX['functionTerms']) {
                    var functionTerm = niceCX['functionTerms'][cxNodeId] ;
                    if ( functionTerm ) { nodeData.name = cxNetworkUtils.stringifyFunctionTerm(functionTerm); }
                } */

                nodeMap[cxNodeId] = { data: nodeData };
            });
        }

        // handle nodeAttributes aspect
        // Note that nodeAttributes elements are handled specially in niceCX as a map of maps!!
        cxNodeAttributes = this.cxNetworkUtils.getNodeAttributes(niceCX);
        var getFirstElementFromList = this.getFirstElementFromList;
        if (cxNodeAttributes) {
            // for each node id
            _.forEach(cxNodeAttributes, function (nodeAttributeMap, nodeId) {
                var node = nodeMap[nodeId];
                if (node) {
                    _.forEach(nodeAttributeMap, function (attributeObject, attributeName) {
                        var cyAttributeName = getCyAttributeName(attributeName, attributeNameMap);
                        var dataType = attributeObject.d;
                        if (cyAttributeName === 'selected') {
                            if (attributeObject.v === 'true') {
                                node.selected = true;
                            } else if (attributeObject.v === 'false') {
                                node.selected = false;
                            }
                        } else if (dataType && _.includes(CX_NUMBER_DATATYPES, dataType.toLowerCase())) {
                            node.data[cyAttributeName] = parseFloat(attributeObject.v);

                        } else if (dataType && _.includes(CX_LIST_DATATYPES, dataType.toLowerCase())) {
                            node.data[cyAttributeName] = getFirstElementFromList(attributeObject);

                            /*  } else if (dataType && dataType === 'boolean') {
      
                                  // N.B.: for Boolean, Cytoscape.js expects 'true' or 'false' (string),
                                  // and not true or false (actual Boolean).
                                  // Thus, we just use attributeObject.v to pass to Cytoscape.js.
                                  //node.data[cyAttributeName] = attributeObject.v;
      
      
                                  if (attributeObject.v === 'true'){
                                      node.data[cyAttributeName] = true;
                                  } else if (attributeObject.v === 'false') {
                                      node.data[cyAttributeName] = false;
                                  }
      */

                        } else {
                            // Default to String && boolean
                            node.data[cyAttributeName] = attributeObject.v;
                        }
                    });
                }
            });
        }

        // handle cartesianCoordinates aspect
        if (niceCX.cartesianLayout) {
            _.forEach(niceCX.cartesianLayout.elements, function (element) {
                var nodeId = element.node;
                var node = nodeMap[nodeId];
                if (node) {
                    node.position = { x: element.x, y: element.y };
                } else {
                    //console.log('no node for cartesian Node Id = ' + nodeId)
                }
            });
        }

        // handle edge aspect
        var cxEdges = this.cxNetworkUtils.getEdges(niceCX);
        if (cxEdges) {
            _.forEach(cxEdges, function (element) {
                var cxEdgeId = element['@id'];
                var edgeData = {
                    id: 'e' + cxEdgeId,
                    source: element.s,
                    target: element.t
                };

                if (element.i) {
                    edgeData.interaction = element.i;
                }

                edgeMap[cxEdgeId] = { data: edgeData };
            });
        }

        // handle edgeAttributes aspect
        // Note that edgeAttributes is a map similar to nodeAttributes!!
        edgeAttributes = this.cxNetworkUtils.getEdgeAttributes(niceCX);
        if (edgeAttributes) {
            _.forEach(edgeAttributes, function (edgeAttributeMap, edgeId) {
                var edge = edgeMap[edgeId];
                if (edge) {
                    _.forEach(edgeAttributeMap, function (attributeObject, attributeName) {
                        var cyAttributeName = getCyAttributeName(attributeName, attributeNameMap);
                        var dataType = attributeObject.d;
                        if (dataType && _.includes(CX_NUMBER_DATATYPES, dataType.toLowerCase())) {
                            edge.data[cyAttributeName] = parseFloat(attributeObject.v);

                        } else if (dataType && _.includes(CX_LIST_DATATYPES, dataType.toLowerCase())) {
                            edge.data[cyAttributeName] = getFirstElementFromList(attributeObject);

                            /*      } else if (dataType && dataType === 'boolean') {
          
                                      // N.B.: for Boolean, Cytoscape.js expects 'true' or 'false' (string),
                                      // and not true or false (actual Boolean).
                                      // Thus, we just use attributeObject.v to pass to Cytoscape.js.
                                      edge.data[cyAttributeName] =  attributeObject.v.toLowerCase() === 'true';
          
                                      /*
                                      if (attributeObject.v === 'true'){
                                          edge.data[cyAttributeName] = 'true';
                                      } else if (attributeObject.v === 'false'){
                                          edge.data[cyAttributeName] = 'false';
                                      }
                                      */

                        } else {
                            // Default to String and boolean
                            edge.data[cyAttributeName] = attributeObject.v;
                        }
                    });
                }
            });
        }

        // output the nodeMap to the nodeList
        _.forEach(nodeMap, function (node) {
            nodeList.push(node);
        });

        // output the edgeMap to the edgeList
        _.forEach(edgeMap, function (edge) {
            edgeList.push(edge);
        });

        return elements;

        // #10 Need to Override ID if exists
        //​ 'ID' has a special meaning in Cytoscape.js and if such attribute is available in CX, it should be replaced to something else.
        // This should be handled carefully because it breaks graph topology if not correctly converted.

        /*

         #15 Implement object position parser and serializer
         Cytoscape uses a special parser/serializer for object position (mainly for label position).  Need to design and implement such function in this converter to handle label positions.


         #16 Replace invalid characters in column names

         This should be done in both attribute names ​_and_​ controlling attribute name in style object.

         replaceInvalid = regexp.MustCompile(`^[^a-zA-Z_]+|[^a-zA-Z_0-9]+`)

         In JavaScript, some of the characters has special meanings.  For example, '.' is used to specify properties of an object, like:

         ```var label = node.label;
         ```

         If CX contains attribute names containing such characters, it breaks Cytoscape.js.  The converter find and replace all of them before converting the actual data.
         */
    }

    // get the color from the network visual property and convert it to CSS format
    cyBackgroundColorFromNiceCX(niceCX) {
        return this.cyVisualPropertyFromNiceCX(niceCX, 'network', 'NETWORK_BACKGROUND_PAINT');
    }

    getDefaultLayout() {
        return DEF_LAYOUT;
    }

    cyStyleFromNiceCX(niceCX, attributeNameMap) {
        //console.log('style from niceCX: ' + Object.keys(niceCX).length);

        var nodeDefaultStyles = [];
        var nodeDefaultMappings = [];
        var nodeSpecificStyles = [];
        var edgeDefaultStyles = [];
        var edgeDefaultMappings = [];
        var edgeSpecificStyles = [];
        var nodeSelectedStyles = [];
        var edgeSelectedStyles = [];


        var visualProperties;
        if (niceCX.cyVisualProperties) {
            visualProperties = niceCX.cyVisualProperties;
        } else if (niceCX.visualProperties) {
            visualProperties = niceCX.visualProperties;
        } else {
            return DEF_VISUAL_STYLE;
        }

        // TODO handle cases with multiple views

        var getCyVisualAttributeForVP = this.getCyVisualAttributeForVP;
        var expandFontProperties = this.expandFontProperties;
        var getCyVisualAttributeTypeForVp = this.getCyVisualAttributeTypeForVp;
        var getCyVisualAttributeValue = this.getCyVisualAttributeValue;
        var expandLabelPosition = this.expandLabelPosition;
        var mappingStyle = this.mappingStyle;
        _.forEach(visualProperties, function (vpAspectElement) {
            _.forEach(vpAspectElement, function (vpElement) {
                //console.log(vpElement);
                var elementType = vpElement.properties_of;
                if (elementType === 'nodes:default') {

                    var cyLabelPositionCoordinates = null;
                    var defaultNodeProperties = {};
                    var nodeSize = null;

                    _.forEach(vpElement.properties, function (value, vp) {
                        //console.log('default node property ' + vp + ' = ' + value);
                        var cyVisualAttribute = getCyVisualAttributeForVP(vp);
                        if (cyVisualAttribute) {
                            if (vp === 'NODE_LABEL_FONT_FACE') {
                                if (value) {
                                   expandFontProperties(value, defaultNodeProperties);
                                } else {
                                    defaultNodeProperties['font-family'] = 'sans-serif';
                                    defaultNodeProperties['font-weight'] = 'normal';
                                }
                            } else if (vp === 'NODE_LABEL_POSITION') {
                                cyLabelPositionCoordinates = value;
                            } else {
                                var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
                                defaultNodeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                            } 
                        } else {
                            if (vp === 'NODE_SELECTED_PAINT') {
                                var selectedColor = getCyVisualAttributeValue(value, 'color');
                                nodeSelectedStyles.push({ 'selector': 'node:selected', 'css': { 'background-color': selectedColor } });

                            } else if (vp === 'NODE_SIZE') {
                                nodeSize = value;

                            } else if (vp === 'NODE_LABEL_WIDTH') {
                                defaultNodeProperties['text-wrap'] = 'wrap';
                                defaultNodeProperties['text-max-width'] = value;

                            } else if (vp === 'NODE_CUSTOMGRAPHICS_1') {

                                if (value && !value.startsWith('org.cytoscape.PieChart')) {
                                    return; // continue the loop
                                }
                                var pieChartStr = value.match(/{.*}/);

                                if (!pieChartStr) {
                                    return; // continue the loop
                                }
                                var pieChartObj = JSON.parse(pieChartStr[0]);

                                /** @namespace pieChartObj.cy_colors **/
                                if (pieChartObj && pieChartObj.cy_colors && Array.isArray(pieChartObj.cy_colors)) {
                                    var i = 1;

                                    _.forEach(pieChartObj.cy_colors, function (color) {
                                        var pieSliceColor = 'pie-' + i + '-background-color';

                                        defaultNodeProperties[pieSliceColor] = color;
                                        i++;
                                    });
                                }

                                /** @namespace pieChartObj.cy_dataColumns **/
                                if (pieChartObj && pieChartObj.cy_dataColumns && Array.isArray(pieChartObj.cy_dataColumns)) {

                                    var j = 1;

                                    var normalizedNames = attributeNameMap;
                                    var pieColumns = {};

                                    for (var l = 0; l < pieChartObj.cy_dataColumns.length; l++) {
                                        pieColumns[pieChartObj.cy_dataColumns[l]] = l;
                                    }

                                    _.forEach(pieChartObj.cy_dataColumns, function (column) {

                                        var pieSliceSize = 'pie-' + j + '-background-size';

                                        defaultNodeProperties[pieSliceSize] = function (ele) {
                                            var data = ele.json().data;
                                            var totalSum = 0;

                                            var currentColumnValue = data[normalizedNames[column]];
                                            if ((typeof currentColumnValue === 'undefined') ||
                                                (currentColumnValue === null) || (currentColumnValue <= 0)) {
                                                return 0;
                                            }

                                            for (var key in pieColumns) {
                                                var columnValue = data[normalizedNames[key]];
                                                if (columnValue > 0) {
                                                    totalSum = totalSum + columnValue;
                                                }
                                            }

                                            return (totalSum > 0) ? (100.0 * currentColumnValue / totalSum) : 0;
                                        };

                                        j++;
                                    });
                                }

                                defaultNodeProperties['pie-size'] = '80%';
                            }

                        }
                    });

                    /** @namespace vpElement.dependencies.nodeSizeLocked **/
                    if (nodeSize && vpElement.dependencies.nodeSizeLocked && vpElement.dependencies.nodeSizeLocked === 'true') {
                        defaultNodeProperties.height = nodeSize;
                        defaultNodeProperties.width = nodeSize;
                    }

                    expandLabelPosition(cyLabelPositionCoordinates, defaultNodeProperties);
                    
                    var defaultNodeStyle = { 'selector': 'node', 'css': defaultNodeProperties };
                    nodeDefaultStyles.push(defaultNodeStyle);

                    _.forEach(vpElement.mappings, function (mapping, vp) {
                        //console.log(mapping);
                        //console.log('VP = ' + vp);
                        // need to check if the nodeSizedLocked is true for NODE_HEIGHT, NODE_WIDTH, and NODE_SIZE
                        if (!((vp === 'NODE_HEIGHT' || vp === 'NODE_WIDTH') &&
                            vpElement.dependencies.nodeSizeLocked && vpElement.dependencies.nodeSizeLocked === 'true') &&
                            !(vp === 'NODE_SIZE' && (!vpElement.dependencies.nodeSizeLocked || (vpElement.dependencies.nodeSizeLocked && vpElement.dependencies.nodeSizeLocked === 'false')))
                        ) {

                            elementType = 'node';
                            var styles = mappingStyle(elementType, vp, mapping.type, mapping.definition, attributeNameMap);
                            nodeDefaultMappings = nodeDefaultMappings.concat(styles);
                        }
                    });

                } else if (elementType === 'edges:default') {

                    var defaultEdgeProperties = {};

                    var selectedEdgeProperties = {};
                    _.forEach(vpElement.properties, function (value, vp) {
                        var cyVisualAttribute = null;
                        var cyVisualAttributeType = null;
                        //console.log('default node property ' + vp + ' = ' + value);
                        //special cases for locked edge color
                        /** @namespace vpElement.dependencies.arrowColorMatchesEdge **/
                        if (vpElement.dependencies.arrowColorMatchesEdge.toLowerCase() === 'true') {
                            if (vp !== 'EDGE_STROKE_UNSELECTED_PAINT' && vp !== 'EDGE_SOURCE_ARROW_UNSELECTED_PAINT' &&
                                vp !== 'EDGE_TARGET_ARROW_UNSELECTED_PAINT') {
                                if (vp === 'EDGE_UNSELECTED_PAINT') {   // add extra handling since the color is locked
                                    cyVisualAttribute = getCyVisualAttributeForVP('EDGE_SOURCE_ARROW_UNSELECTED_PAINT');
                                    cyVisualAttributeType = getCyVisualAttributeTypeForVp('EDGE_SOURCE_ARROW_UNSELECTED_PAINT');
                                    defaultEdgeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                                    cyVisualAttribute = getCyVisualAttributeForVP('EDGE_TARGET_ARROW_UNSELECTED_PAINT');
                                    cyVisualAttributeType = getCyVisualAttributeTypeForVp('EDGE_TARGET_ARROW_UNSELECTED_PAINT');
                                    defaultEdgeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                                }
                                cyVisualAttribute = getCyVisualAttributeForVP(vp);
                                if (cyVisualAttribute) {
                                    if (vp === 'EDGE_LABEL_FONT_FACE') {
                                        if (value) {
                                           expandFontProperties(value, defaultEdgeProperties);
                                        } else {
                                            defaultEdgeProperties['font-family'] = 'sans-serif';
                                            defaultEdgeProperties['font-weight'] = 'normal';
                                        }
                                    } else {
                                        cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
                                        defaultEdgeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                                    }
                                } else if (vp === 'EDGE_STROKE_SELECTED_PAINT') {
                                    selectedEdgeProperties['line-color'] = getCyVisualAttributeValue(value, 'color');
                                } else if (vp === 'EDGE_SOURCE_ARROW_SELECTED_PAINT') {
                                    selectedEdgeProperties['source-arrow-color'] = getCyVisualAttributeValue(value, 'color');
                                } else if (vp === 'EDGE_TARGET_ARROW_SELECTED_PAINT') {
                                    selectedEdgeProperties['target-arrow-color'] = getCyVisualAttributeValue(value, 'color');
                                }

                            }
                        } else {
                            if (vp !== 'EDGE_UNSELECTED_PAINT') {
                                cyVisualAttribute = getCyVisualAttributeForVP(vp);
                                if (cyVisualAttribute) {
                                    if (vp === 'EDGE_LABEL_FONT_FACE') {
                                        if (value) {
                                           expandFontProperties(value, defaultEdgeProperties);
                                        } else {
                                            defaultEdgeProperties['font-family'] = 'sans-serif';
                                            defaultEdgeProperties['font-weight'] = 'normal';
                                        }
                                    } else {
                                        cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);    
                                        defaultEdgeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                                    }
                                } else if (vp === 'EDGE_STROKE_SELECTED_PAINT') {
                                    selectedEdgeProperties['line-color'] = getCyVisualAttributeValue(value, 'color');
                                } else if (vp === 'EDGE_SOURCE_ARROW_SELECTED_PAINT') {
                                    selectedEdgeProperties['source-arrow-color'] = getCyVisualAttributeValue(value, 'color');
                                } else if (vp === 'EDGE_TARGET_ARROW_SELECTED_PAINT') {
                                    selectedEdgeProperties['target-arrow-color'] = getCyVisualAttributeValue(value, 'color');
                                }
                            }
                        }


                    });
                    if (_.keys(selectedEdgeProperties).length > 0) {
                        edgeSelectedStyles.push({ 'selector': 'edge:selected', 'css': selectedEdgeProperties });
                    }
                    var defaultEdgeStyle = { 'selector': 'edge', 'css': defaultEdgeProperties };
                    edgeDefaultStyles.push(defaultEdgeStyle);

                    _.forEach(vpElement.mappings, function (mapping, vp) {
                        //console.log(mapping);
                        //console.log('VP = ' + vp);
                        elementType = 'edge';
                        var styles = null;

                        if (vpElement.dependencies.arrowColorMatchesEdge === 'true') {
                            if (vp !== 'EDGE_STROKE_UNSELECTED_PAINT' && vp !== 'EDGE_SOURCE_ARROW_UNSELECTED_PAINT' &&
                                vp !== 'EDGE_TARGET_ARROW_UNSELECTED_PAINT') {
                                if (vp === 'EDGE_UNSELECTED_PAINT') {
                                    styles = mappingStyle(elementType, 'EDGE_TARGET_ARROW_UNSELECTED_PAINT', mapping.type, mapping.definition, attributeNameMap);
                                    edgeDefaultMappings = edgeDefaultMappings.concat(styles);
                                    styles = mappingStyle(elementType, 'EDGE_SOURCE_ARROW_UNSELECTED_PAINT', mapping.type, mapping.definition, attributeNameMap);
                                    edgeDefaultMappings = edgeDefaultMappings.concat(styles);
                                }
                                styles = mappingStyle(elementType, vp, mapping.type, mapping.definition, attributeNameMap);
                                edgeDefaultMappings = edgeDefaultMappings.concat(styles);
                            }
                        } else {

                            styles = mappingStyle(elementType, vp, mapping.type, mapping.definition, attributeNameMap);
                            edgeDefaultMappings = edgeDefaultMappings.concat(styles);
                        }
                    });

                    /*   _.forEach(vpElement.dependencies, function(value, vp) {
                           if ( vp === 'arrowColorMatchesEdge') {
                               defaultEdgeProperties['source-arrow-color'] = defaultEdgeProperties['line-color'];
                               defaultEdgeProperties['target-arrow-color'] = defaultEdgeProperties['line-color'];
                            }
   
                       }); */
                    /*
                    Cytoscape js defaults to a very basic curve style that doesn't support things like curvature and 
                    arrows. If the style is not deliberately set at this point, it is switched to 'bezier' to allow 
                    for arrows and curvatures.
                    */
                    if (!defaultEdgeProperties['curve-style']) {
                        defaultEdgeProperties['curve-style'] = 'bezier';
                    }
                } else if (elementType === 'nodes') {
                    // 'bypass' setting node specific properties
                    /** @namespace vpElement.applies_to **/
                    var nodeId = vpElement.applies_to;
                    var nodeProperties = {};
                    _.forEach(vpElement.properties, function (value, vp) {
                        var cyVisualAttribute = getCyVisualAttributeForVP(vp);
                        if (cyVisualAttribute) {
                            var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
                            if (vp === 'NODE_LABEL_FONT_FACE') {
                                if (value) {
                                    expandFontProperties(value, nodeProperties);
                                }
                            } else if (vp === 'NODE_LABEL_POSITION') {
                                expandLabelPosition(value, nodeProperties);
                            } else {
                                nodeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                            }
                        }
                    });
                    var nodeSelector = 'node[ id = \'' + nodeId + '\' ]';
                    var nodeStyle = { 'selector': nodeSelector, 'css': nodeProperties };
                    nodeSpecificStyles.push(nodeStyle);

                } else if (elementType === 'edges') {
                    // 'bypass' setting edge specific properties
                    var edgeId = vpElement.applies_to;
                    var edgeProperties = {};
                    _.forEach(vpElement.properties, function (value, vp) {
                        var cyVisualAttribute = getCyVisualAttributeForVP(vp);
                        if (cyVisualAttribute) {
                            var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
                            if (vp === 'EDGE_LABEL_FONT_FACE') {
                                if (value) {
                                   expandFontProperties(value, edgeProperties);
                                }
                            } else {
                                edgeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                            }
                        }
                    });
                    var edgeSelector = 'edge[ id = \'e' + edgeId + '\' ]';
                    var edgeStyle = { 'selector': edgeSelector, 'css': edgeProperties };
                    edgeSpecificStyles.push(edgeStyle);
                }
            });
        });

        return nodeDefaultStyles.concat(
            nodeDefaultMappings,
            nodeSpecificStyles,
            edgeDefaultStyles,
            edgeDefaultMappings,
            edgeSpecificStyles,
            nodeSelectedStyles,
            edgeSelectedStyles);
    }

    cyZoomFromNiceCX(niceCX) {
        let networkScaleFactor = this.cyVisualPropertyFromNiceCX(niceCX, 'network', 'NETWORK_SCALE_FACTOR');
        return networkScaleFactor ? parseInt(networkScaleFactor) : false;
    }

    cyPanFromNiceCX(niceCX) {
        let cyX = this.cyVisualPropertyFromNiceCX(niceCX, 'network', 'NETWORK_CENTER_X_LOCATION');
        let cyY = this.cyVisualPropertyFromNiceCX(niceCX, 'network', 'NETWORK_CENTER_Y_LOCATION');
        if (cyX && cyY) {
            let result = { x : parseFloat(cyX), y: parseFloat(cyY)};
            return result;
        } else {
            return false;
        }
    }

    drawAnnotationsFromNiceCX(cytoscape, cy, niceCX) {
        //register extension
        cyCanvas(cytoscape); 
        //console.log("setting up annotations");
        const bottomLayer = cy.cyCanvas({
            zIndex: -1
        });

        const topLayer = cy.cyCanvas({
            zIndex: 1
        });

        const bottomCanvas = bottomLayer.getCanvas();
        const bottomCtx = bottomCanvas.getContext("2d");

        const topCanvas = topLayer.getCanvas();
        const topCtx = topCanvas.getContext("2d");

        cy.on("render cyCanvas.resize", evt => {
            
            var colorFromInt = this._colorFromInt;
            var shapeFunctions = this.shapeFunctions;
            //console.log("render cyCanvas.resize event");
            bottomLayer.resetTransform(bottomCtx);
            bottomLayer.clear(bottomCtx);
            bottomLayer.setTransform(bottomCtx);
            
            bottomCtx.save();

            topLayer.resetTransform(topCtx);
            topLayer.clear(topCtx);
            topLayer.setTransform(topCtx);
            
            topCtx.save();

            _.forEach(niceCX['networkAttributes']['elements'], function (element) {
                if (element['n'] == '__Annotations') {
                    _.forEach(element['v'], function(annotation) {
                        var annotationKVList = annotation.split("|");
                        var annotationMap = {};
                        _.forEach(annotationKVList, function(annotationKV) {
                            var kvPair = annotationKV.split("=");
                            annotationMap[kvPair[0]] = kvPair[1];
                        });
                        
                        var ctx;
                        if (annotationMap['canvas'] == 'foreground') {
                            ctx = topCtx;
                        } else {
                            ctx = bottomCtx;
                        }
                       
                        if (annotationMap['type']=='org.cytoscape.view.presentation.annotations.ShapeAnnotation' || annotationMap['type']=='org.cytoscape.view.presentation.annotations.BoundedTextAnnotation') {
                            ctx.beginPath();
                            
                            ctx.lineWidth = annotationMap['edgeThickness'];

                            annotationMap['width'] = parseFloat(annotationMap['width']) / parseFloat(annotationMap['zoom']);
                            annotationMap['height'] = parseFloat(annotationMap['height']) / parseFloat(annotationMap['zoom']);
                            if (shapeFunctions[annotationMap['shapeType']]) {
                                shapeFunctions[annotationMap['shapeType']](annotationMap, ctx);
                                if (annotationMap['fillColor']) {
                                    let fillColor = colorFromInt(annotationMap['fillColor'], annotationMap['fillOpacity']);
                                    
                                    ctx.fillStyle = fillColor;
                                    ctx.fill();
                                }
                                ctx.fillStyle = colorFromInt(annotationMap['edgeColor'], annotationMap['edgeOpacity']);
                                ctx.stroke();
                            } else {
                                console.warn("Invalid shape type: " + annotationMap['shapeType']);
                            }
                        }

                        var text;
                        var textX;
                        var textY;

                        if (annotationMap['type']=='org.cytoscape.view.presentation.annotations.TextAnnotation') {
                            text = annotationMap['text'];
                            ctx.textBaseline="top"; 
                            ctx.textAlign="left";
                            textX = annotationMap['x'];
                            textY = annotationMap['y'];
                        } else if (annotationMap['type']=='org.cytoscape.view.presentation.annotations.BoundedTextAnnotation') {
                            text = annotationMap['text'];
                            
                            ctx.textBaseline="middle"; 
                            ctx.textAlign="center";
                            
                            textX = parseFloat(annotationMap['x']) + annotationMap['width']/2;
                            textY = parseFloat(annotationMap['y']) + annotationMap['height']/2;
                        } 

                        if (text && textX && textY) {
                            var fontSize = parseFloat(annotationMap['fontSize']) / parseFloat(annotationMap['zoom']);
                            ctx.font = fontSize + "px Helvetica";
                         
                            if (annotationMap['color']) {
                                let fillColor = colorFromInt(annotationMap['fillColor'], '100');
                                ctx.fillStyle = fillColor;
                            }
                            ctx.fillText(text, textX, textY);
                        }  
                    });
                }
            });
            // Draw text that follows the model
           

            // Draw arc
            /*
            ctx.beginPath();
            ctx.arc(95, 50, 400, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.stroke();
            */
            //edgeThickness=1.0|canvas=foreground|fillOpacity=100.0|zoom=0.6561000000000001|type=org.cytoscape.view.presentation.annotations.ShapeAnnotation|uuid=436a8823-366f-4800-9a28-d3ecb940d9e6|shapeType=ELLIPSE|edgeColor=-16777216|edgeOpacity=100.0|name=Shape 1|x=-189.06721536351156|width=192.2372796298035|y=-105.5486968449931|z=0|height=91.85399026680032
            //edgeThickness=1.0|canvas=foreground|fillOpacity=100.0|zoom=0.81|type=org.cytoscape.view.presentation.annotations.ShapeAnnotation|uuid=436a8823-366f-4800-9a28-d3ecb940d9e6|shapeType=ELLIPSE|edgeColor=-16777216|edgeOpacity=100.0|name=Shape 1|x=-189.13580246913577|width=237.3299874258043|y=-106.23456790123454|z=0|height=113.39999399185189
            /*
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.rect(200,200,250,250);
            ctx.fill();
            ctx.stroke();
            */
            bottomCtx.restore();
        });
    }

    /*

     Issues reported for cx2cyjs

     */

    /*        #12 Selected Node/Edge default value handler
     In Cytoscape, there are selected node/edge color visual property, but there is no such thing in Cytoscape.js.
     We need to convert default value of selected colors into special CSS Selector, like:

     ```"selector": "node:selected",
     "styles": {
     "background-color": "#0033CC"


     #13 Locked Visual Properties are not handled properly
     VP lock is not handled in current version.
     Need to design and implement such function in Style converter.  Two main lockings are:

     • Size
     • Arrow Color

     }*/
    /*

     #18 Passthrough mapping conversion is incomplete
     In Cytoscape, Passthrough mapping supports various data types, including numbers, custom graphics, and labels.
     Currently, this Style converter supports numbers and labels

     */

    /*

     #19 Add Custom Graphics Support
     Cytoscape.scripts has an easy-to-use data mapper function from URL to images on nodes:

     https://gist.github.com/maxkfranz/aedff159b0df05ccfaa5

     This can be done by supporting discrete/passthrough mapping, but not implemented.  We need to add support for this type of mappings.


     #22 Handle text wrapping and LABEL_WIDTH visual property
     Cytoscape supports LABEL_WIDTH visual property to limit the width of labels.  And Cytoscape.scripts supports similar property ​_text-max-width_​.  But currently these are simply ignored and always render very long label if text length is long.

     The Style converter should support this visual property.


     #23 Implement workaround for NODE_SIZE defaults and mappings
     Current converter cannot handle NODE_SIZE because it depends on visual property locks.

     Before implementing complete lock handler, we need to implement some workaround to handle size.

     */


    allNodesHaveUniquePositions(cyElements) {
        var nodePositionMap = {};
        var nodes = cyElements.nodes;
        for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
            var node = nodes[nodeIndex];
            var position = node.position;
            if (!position) {
                // found a node without a position so we return false
                return false;
            }
            var positionKey = position.x + '_' + position.y;
            if (nodePositionMap[positionKey]) {
                // found a duplicate position so we return false
                return false;
            } else {
                // add this position to the map
                nodePositionMap[positionKey] = position;
            }

        }
        return true;
    }

    /*
    factory.getCy = function () {
        return cy;
    };
    */
}


class CyNetworkUtils {

    constructor() {
    }


    rawCXtoNiceCX(rawCX) {

        var niceCX = {};
        niceCX['edges'] = {};

        for (var i = 0; i < rawCX.length; i++) {
            var fragment = rawCX[i];
            if (fragment) {
                var aspectName;
                for (aspectName in fragment) {

                    var elements = fragment[aspectName];

                    if (aspectName === 'numberVerification') {

                        if (!niceCX.numberVerification) {
                            niceCX.numberVerification = fragment;
                        }
                        continue;

                    } else if (aspectName === 'status') {

                        if (!niceCX.status) {
                            niceCX.status = fragment;
                        }
                        continue;

                    } else if (aspectName === 'metaData') {

                        if (!niceCX.preMetaData) {

                            niceCX.preMetaData = fragment;

                        } else if (!niceCX.postMetaData) {

                            niceCX.postMetaData = fragment;
                        }
                        continue;
                    }

                    for (var j = 0; j < elements.length; j++) {
                        var element = elements[j];
                        this.handleCxElement(aspectName, element, niceCX);
                    }
                }
            }
        }

        return niceCX;
    }


    computePreMetadata(niceCX) {
        var preMetaData = [];
        var d = new Date();
        var currentTime = d.getTime();

        _.forEach(niceCX, function (aspectValues, aspectName) {
            var metadataElement = {
                'consistencyGroup': 1,
                //    "elementCount" : aspectValues.length,
                'lastUpdate': currentTime,
                'name': aspectName,
                'properties': [],
                'version': '1.0'
            };

            if (aspectName === 'nodes' ||
                aspectName === 'edges' ||
                aspectName === 'citations' ||
                aspectName === 'supports') {
                var objids = Object.keys(aspectValues);
                metadataElement['elementCount'] = objids.length;
                metadataElement['idCounter'] = Number(objids.reduce(function (a, b) {
                    return Number(a) > Number(b) ? a : b;
                }));
            }

            preMetaData.push(metadataElement);
        });

        return { 'metaData': preMetaData };
    }

    niceCXToRawCX(niceCX) {

        var rawCX = [];

        if (niceCX.numberVerification) {
            rawCX.push(niceCX.numberVerification);
        } else {
            rawCX.push({
                'numberVerification': [{
                    'longNumber': 281474976710655
                }]
            });
        }

        if (niceCX.preMetaData) {
            rawCX.push(niceCX.preMetaData);
        } else {
            rawCX.push(this.computePreMetadata(niceCX));
        }

        for (var aspectName in niceCX) {


            if ((aspectName === 'preMetaData') || (aspectName === 'postMetaData') ||
                (aspectName === 'numberVerification') || (aspectName === 'status')) {
                continue;

            }

            var elements = [];

            if (aspectName === 'nodes' || aspectName === 'edges' ||
                aspectName === 'citations' || aspectName === 'supports' || aspectName === 'functionTerms') {

                _.forEach(niceCX[aspectName], function (element, id) {
                    elements.push(element);
                });
            } else if (aspectName === 'nodeAttributes' || aspectName === 'edgeAttributes') {
                _.forEach(niceCX[aspectName], function (attributes, id) {
                    _.forEach(attributes, function (attribute, attrName) {
                        elements.push(attribute);
                    });
                });

            } else if (aspectName === 'edgeCitations' || aspectName === 'nodeCitations') {
                _.forEach(niceCX[aspectName], function (citationIds, elementId) {
                    var citation = { 'po': [Number(elementId)], 'citations': citationIds };
                    elements.push(citation);
                });

            } else if (aspectName === 'edgeSupports' || aspectName === 'nodeSupports') {
                _.forEach(niceCX[aspectName], function (supportIds, elementId) {
                    var support = { 'po': [Number(elementId)], 'supports': supportIds };
                    elements.push(support);
                });
            } else {
                elements = niceCX[aspectName]['elements'];
            }

            if (elements.length > 0) {
                var fragment = {};
                fragment[aspectName] = elements;
                rawCX.push(fragment);
            }
        }

        if (niceCX.postMetaData) {
            rawCX.push(niceCX.postMetaData);
        }

        if (niceCX.status) {
            rawCX.push(niceCX.status);
        } else {
            rawCX.push({
                'status': [{
                    'error': '',
                    'success': true
                }]
            });
        }
        return rawCX;
    }


    addElementToAspectValueMap(aspectValueMap, element) {
        var attributes = aspectValueMap[element.po];

        if (!attributes) {
            attributes = {};
            aspectValueMap[element.po] = attributes;
        }

        attributes[element.n] = element;
    }


    addRelationToRelationAspect(aspect, element, relationName) {

        for (var l = 0; l < element.po.length; l++) {
            var srcId = element.po[l];
            var relations = aspect[srcId];
            if (!relations) {
                aspect[srcId] = element[relationName];
            } else {
                aspect[srcId].push.apply(element[relationName]);
            }
        }
    }

    handleCxElement(aspectName, element, niceCX) {

        var aspect = niceCX[aspectName];

        if (!aspect) {
            aspect = {};

            niceCX[aspectName] = aspect;
        }

        switch (aspectName) {
            case 'nodes':
            case 'edges':
            case 'citations':
            case 'supports':
                aspect[element['@id']] = element;
                break;
            case 'nodeAttributes':
                this.addElementToAspectValueMap(aspect, element);
                break;
            case 'edgeAttributes':
                this.addElementToAspectValueMap(aspect, element);
                break;
            case 'edgeCitations':
            case 'nodeCitations':
                this.addRelationToRelationAspect(aspect, element, 'citations');
                break;
            case 'edgeSupports':
            case 'nodeSupports':
                this.addRelationToRelationAspect(aspect, element, 'supports');
                break;
            case 'functionTerms':
                aspect[element['po']] = element;
                break;
            default:
                // opaque for now
                if (!aspect.elements) {
                    aspect.elements = [];
                }
                aspect.elements.push(element);
        }
    }


    /** utility functions for nice cx */

    getNodes(niceCX) {
        return Object.values(niceCX['nodes']);
    }

    getNodeAttributes(niceCX) {
        return niceCX['nodeAttributes'];
    }

    getEdges(niceCX) {
        return Object.values(niceCX.edges);
    }

    getEdgeAttributes(niceCX) {
        return niceCX['edgeAttributes'];
    }

    stringifyFunctionTerm(functionTerm) {
        var params = [];
        _.forEach(functionTerm.args, function (parameter) {
            if (parameter.f) {
                params.push(this.stringifyFunctionTerm(parameter));
            } else {
                params.push(parameter);
            }
        });
        return this.abbreviate(functionTerm.f) + '(' + params.join(', ') + ')';
    }


    abbreviate(functionName) {
        var pureFunctionName = functionName;
        var arr = functionName.split(':');
        if (arr.length == 2)
            pureFunctionName = arr[1];

        switch (pureFunctionName) {
            case 'abundance':
                return 'a';
            case 'biologicalProcess':
                return 'bp';
            case 'catalyticActivity':
                return 'cat';
            case 'cellSecretion':
                return 'sec';
            case 'cellSurfaceExpression':
                return 'surf';
            case 'chaperoneActivity':
                return 'chap';
            case 'complexAbundance':
                return 'complex';
            case 'compositeAbundance':
                return 'composite';
            case 'degradation':
                return 'deg';
            case 'fusion':
                return 'fus';
            case 'geneAbundance':
                return 'g';
            case 'gtpBoundActivity':
                return 'gtp';
            case 'kinaseActivity':
                return 'kin';
            case 'microRNAAbundance':
                return 'm';
            case 'molecularActivity':
                return 'act';
            case 'pathology':
                return 'path';
            case 'peptidaseActivity':
                return 'pep';
            case 'phosphateActivity':
                return 'phos';
            case 'proteinAbundance':
                return 'p';
            case 'proteinModification':
                return 'pmod';
            case 'reaction':
                return 'rxn';
            case 'ribosylationActivity':
                return 'ribo';
            case 'rnaAbundance':
                return 'r';
            case 'substitution':
                return 'sub';
            case 'translocation':
                return 'tloc';
            case 'transcriptionalActivity':
                return 'tscript';
            case 'transportActivity':
                return 'tport';
            case 'truncation':
                return 'trunc';
            case 'increases':
                return '->';
            case 'decreases':
                return '-|';
            case 'directlyIncreases':
                return '=>';
            case 'directlyDecreases':
                return '=|';
            default:
                return pureFunctionName;
        }
    }

    createCXFunctionTerm(oldJSONNetwork, jsonFunctionTerm) {
        var functionTerm = { 'f': this.getBaseTermStr(oldJSONNetwork, jsonFunctionTerm.functionTermId) };
        var parameters = [];
        _.forEach(jsonFunctionTerm.parameterIds, function (parameterId) {
            var baseTerm = oldJSONNetwork['baseTerms'][parameterId];
            if (baseTerm) {
                parameters.push(this.getBaseTermStr(oldJSONNetwork, parameterId));
            } else {
                var paraFunctionTerm = oldJSONNetwork['functionTerms'][parameterId];
                parameters.push(this.createCXFunctionTerm(oldJSONNetwork, paraFunctionTerm));
            }
        });
        functionTerm['args'] = parameters;

        return functionTerm;
    }

    /*-----------------------------------------------------------------------*
     * Convert network received in JSON format to NiceCX;
     * Convert only nodes and edges now.
     *-----------------------------------------------------------------------*/
    convertNetworkInJSONToNiceCX(network) {

        var niceCX = {
            'edges': {},
            'nodes': {}
        };

        if (Object.keys(network.namespaces).length > 0) {
            var nstable = {};
            niceCX['@context'] = { 'elements': [nstable] };

            _.each(network.namespaces, function (namespaceId, namespace) {
                nstable[namespace['prefix']] = namespace['uri'];
                /*  _.forEach(namespace, function (value, prefix) {
                 nstable[prefix] = value;
                 }); */
            });
        }

        if (network.properties) {
            _.forEach(network.properties, function (propertyObj) {
                self.setNetworkProperty(niceCX, propertyObj['predicateString'], propertyObj['value'],
                    propertyObj['dataType']);
            });
        }

        var functionTermTable = {};  //functionTermId to CXFunctionTerm maping table.
        if (network.functionTerms) {
            niceCX['functionTerms'] = {};
            _.forEach(network.functionTerms, function (funcTerm, id) {
                functionTermTable[id] = this.createCXFunctionTerm(network, funcTerm);
            });
        }

        _.each(network.citations, function (citationId, citation) {
            /* ATTENTION: we still need to process citation.contributors and citation.properties fields */

            var citationElement = {
                '@id': citation.id,
                'dc:identifier': (citation.identifier) ? citation.identifier : null,
                'dc:title': citation.title,
                'dc:type': (citation.idType) ? citation.idType : null,
                'dc:description': (citation.description) ? citation.description : null,
                'dc:contributor': citation.constructor
            };

            // ALSO:  do we want to add citationElement as a lookup with citationID as the key --
            // if yest, then use addElementToNiceCXForLookup() below instead of addElementToNiceCX()
            //addElementToNiceCXForLookup(niceCX, 'citations', citationId, citationElement);

            this.addElementToNiceCX(niceCX, 'citations', citationElement);
        });



        _.each(network.supports, function (supportId, support) {
            /* ATTENTION: we still need to process citation.contributors and citation.properties fields */

            var supportElement = {
                '@id': supportId,
                'text': support.text,
                'citation': support.citaitonId

            };

            // ALSO:  do we want to add citationElement as a lookup with citationID as the key --
            // if yest, then use addElementToNiceCXForLookup() below instead of addElementToNiceCX()
            //addElementToNiceCXForLookup(niceCX, 'citations', citationId, citationElement);

            this.addElementToNiceCX(niceCX, 'supports', supportElement);
        });

        _.each(network.nodes, function (nodeId, node) {
            var element = {
                '@id': nodeId
            };

            if (node.name)
                element['n'] = node.name;

            if (node.represents) {
                if (node.representsTermType === 'baseTerm') {
                    element['r'] = this.getBaseTermStr(network, node.represents);
                } else if (node.representsTermType === 'functionTerm') {
                    var cxFunctionTerm = functionTermTable[node.represents];
                    cxFunctionTerm['po'] = nodeId;
                    niceCX['functionTerms'][nodeId] = cxFunctionTerm;
                } else {
                    //console.log('unsupported termType found in the network ...')
                }
            }

            this.addElementToNiceCX(niceCX, 'nodes', element);

            if (node.aliases && node.aliases.length > 0) {
                var aliasList = this.buildBasetermStrListFromIDs(network, node.aliases);
                this.setNodeAttribute(niceCX, nodeId, 'alias', aliasList, 'list_of_string');
            }

            // related terms...
            if (node.relatedTerms && node.relatedTerms.length > 0) {
                var relatedToList = this.buildBasetermStrListFromIDs(network, node.relatedTerms);
                this.setNodeAttribute(niceCX, nodeId, 'relatedTo', relatedToList, 'list_of_string');
            }

            //node properties
            if (node.properties && node.properties.length > 0) {

                for (var i = 0; i < node.properties.length; i++) {

                    var propertyObj = node.properties[i];

                    this.setNodeAttribute(niceCX, nodeId, propertyObj['predicateString'], propertyObj['value'],
                        propertyObj['dataType']);
                }

            }


            if (node.citationIds && node.citationIds.length > 0) {

                var aspect = niceCX['nodeCitations'];
                if (!aspect) {
                    aspect = {};
                    niceCX['nodeCitations'] = aspect;
                }

                var oldList = aspect[nodeId];

                if (!oldList) {
                    oldList = [];
                    aspect[nodeId] = oldList;
                }

                for (var i = 0; i < node.citationIds.length; i++) {
                    oldList.push(node.citationIds[i]);
                }

            }

            if (node.supportIds && node.supportIds.length > 0) {

                var aspect = niceCX['nodeSupports'];
                if (!aspect) {
                    aspect = {};
                    niceCX['nodeSupports'] = aspect;
                }

                let oldList = aspect[nodeId];

                if (!oldList) {
                    oldList = [];
                    aspect[nodeId] = oldList;
                }

                for (var i = 0; i < node.supportIds.length; i++) {
                    oldList.push(node.supportIds[i]);
                }

            }

        });

        _.each(network.edges, function (edgeId, edge) {

            var element = {
                '@id': Number(edgeId),
                's': edge.subjectId,
                't': edge.objectId
            };

            if (edge.predicateId && edge.predicateId >= 0) {
                element['i'] = this.getBaseTermStr(network, edge.predicateId);
            }

            this.addElementToNiceCX(niceCX, 'edges', element);


            if (edge.properties && edge.properties.length > 0) {

                for (var i = 0; i < edge.properties.length; i++) {

                    var propertyObj = edge.properties[i];

                    this.setEdgeAttribute(niceCX, edgeId, propertyObj['predicateString'], propertyObj['value'],
                        propertyObj['dataType']);
                }
            }

            if (edge.citationIds && edge.citationIds.length > 0) {

                var aspect = niceCX['edgeCitations'];
                if (!aspect) {
                    aspect = {};
                    niceCX['edgeCitations'] = aspect;
                }

                var oldList = aspect[edgeId];

                if (!oldList) {
                    oldList = [];
                    aspect[edgeId] = oldList;
                }

                for (var i = 0; i < edge.citationIds.length; i++) {
                    oldList.push(edge.citationIds[i]);
                }

            }

            if (edge.supportIds && edge.supportIds.length > 0) {

                var aspect = niceCX['edgeSupports'];
                if (!aspect) {
                    aspect = {};
                    niceCX['edgeSupports'] = aspect;
                }

                var oldList = aspect[edgeId];

                if (!oldList) {
                    oldList = [];
                    aspect[edgeId] = oldList;
                }

                for (var i = 0; i < edge.supportIds.length; i++) {
                    oldList.push(edge.supportIds[i]);
                }

            }

        });

        return niceCX;
    }

    /**
     * Stringify a baseterm.
     * @param network
     * @param baseTermId
     * @returns {*}
     */
    getBaseTermStr(network, baseTermId) {
        var bterm = network.baseTerms[baseTermId];
        if (bterm && bterm.namespaceId && (bterm.namespaceId > 0)) {
            var ns = network.namespaces[bterm.namespaceId];
            if (ns.prefix)
                return ns.prefix + ':' + bterm.name;
            else
                return ns.uri + bterm.name;
        }
        return bterm.name;
    }

    addElementToNiceCX(niceCX, aspectName, element) {

        var aspect = niceCX[aspectName];

        if (!aspect) {
            // add aspect to niceCX
            aspect = {};

            niceCX[aspectName] = aspect;
        }

        aspect[element['@id']] = element;
    }


    buildBasetermStrListFromIDs(network, arrayOfIDs) {
        var attributes = [];

        for (var i = 0; i < arrayOfIDs.length; i++) {
            var baseTermId = arrayOfIDs[i];
            attributes.push(getBaseTermStr(network, baseTermId));
        }
        return attributes;
    }

    setNodeAttribute(niceCX, nodeId, attributeName, attributeValue, attributeDataType) {
        this.setCoreAspectAttributes(niceCX, 'nodeAttributes', nodeId, attributeName, attributeValue, attributeDataType);
    }

    setEdgeAttribute(niceCX, edgeId, attributeName, attributeValue, attributeDataType) {
        this.setCoreAspectAttributes(niceCX, 'edgeAttributes', edgeId, attributeName, attributeValue, attributeDataType);
    }


    setCoreAspectAttributes(niceCX, aspectName, referenceId, attributeName, attributeValue, attributeDataType) {

        var attributeObject = {
            'v': ((attributeDataType.substring(0, 7) === 'list_of' && typeof attributeValue === 'string') ? JSON.parse(attributeValue) : attributeValue),
            'd': attributeDataType,
            'po': referenceId,
            'n': attributeName
        };

        if (!niceCX[aspectName]) {
            niceCX[aspectName] = {};
        }

        if (!niceCX[aspectName][referenceId]) {
            niceCX[aspectName][referenceId] = {};
        }

        niceCX[aspectName][referenceId][attributeName] = attributeObject;
    }


    setNetworkProperty(niceCX, attributeName, attributeValue, attributeDataType) {
        var dType = attributeDataType ? attributeDataType : 'string';

        var value = ((dType.substring(0, 7) === 'list_of' && typeof attributeValue === 'string') ? JSON.parse(attributeValue) : attributeValue);

        var attributes = niceCX['networkAttributes'];
        if (!attributes) {
            attributes = {
                'elements': [{
                    'v': value,
                    'd': dType,
                    'n': attributeName
                }]
            };
            niceCX['networkAttributes'] = attributes;
        } else {
            var found = false;
            _.forEach(attributes.elements, function (attr) {
                if (attr['n'] === attributeName) {
                    attr['d'] = dType;
                    attr['v'] = value;
                    found = true;
                    return false;
                }
            });
            if (!found) {
                attributes['elements'].push({
                    'v': value,
                    'd': dType,
                    'n': attributeName
                });
            }
        }

    }

    /*
    //TODO: needs to handle collections in the future
    self.getTitleFromNiceCX = function(niceCX){
        const attributes = niceCX['networkAttributes'];
        if ( attributes ) {
            for ( let i = 0 ; i < attributes.elements.length; i ++) {
                const attr = attributes.elements[i];
                if (attr.n === 'name') {
                    return attr.v;
                }
            }
        }
        return undefined;
    };*/

    //TODO: needs to handle collections in the future
    // Partially populate a networkSummary object from a niceCX object.
    getPartialSummaryFromNiceCX(niceCX) {
        var summary = {
            'name': 'Untitled',
            'edgeCount': niceCX['edges'] === undefined ? 0 : Object.keys(niceCX['edges']).length,
            'nodeCount': niceCX['nodes'] === undefined ? 0 : Object.keys(niceCX['nodes']).length,
            'properties': []
        };

        const attributes = niceCX['networkAttributes'];
        if (attributes) {
            for (var i = 0; i < attributes.elements.length; i++) {
                const attr = attributes.elements[i];
                if (attr.n === 'name') {
                    summary['name'] = attr.v;
                } else if (attr.n === 'description') {
                    summary['description'] = attr.v;
                } else if (attr.n === 'version') {
                    summary['version'] = attr.v;
                } else if (attr.n === 'ndex:sourceFormat') {
                    summary['sourceFormat'] = attr.v;
                } else
                    summary['properties'].push(
                        {
                            subNetworkId: attr.s,
                            predicateString: attr.n,
                            dataType: attr.d,
                            value: attr.v
                        }
                    );
            }
        }
        return summary;
    }


    getDefaultNodeLabel(niceCX, nodeElement) {
        if (nodeElement.n) {
            return nodeElement.n;
        } else if (nodeElement.represents) {
            return nodeElement.represents;
        } else if (niceCX['functionTerms']) {
            var functionTerm = niceCX['functionTerms'][nodeElement['@id']];
            if (functionTerm) {
                return stringifyFunctionTerm(functionTerm);
            }
        }
        return nodeElement['@id'];
    }

    getProvenanceFromNiceCX(niceCX) {
        const history = niceCX['provenanceHistory'];
        if (history !== undefined) {
            return history.elements[0].entity;
        }
    }
}

module.exports = { CxToJs, CyNetworkUtils };