import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

export class ChessBoard3 {
    // ---------------------------------------------------------------------//
    //                               CONSTANTS                              //
    // ---------------------------------------------------------------------//
    MINIMUM_THREEJS_REVISION = 71;
    START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    COLUMNS = "abcdefgh".split('');
    LIGHT_POSITIONS = [
          [50, 40, 30],
          [-50, 0, -30] // place at y=0 to avoid double phong reflection off the board
      ];
    SQUARE_SIZE = 2;
    CAMERA_POLAR_ANGLE = Math.PI / 4;
    CAMERA_DISTANCE = 18.25;
    SPARE_POSITION : any = {
          sw1 : 'wK', sw2: 'wQ', sw3: 'wR', sw4: 'wB', sw5: 'wN', sw6: 'wP',
          sb1 : 'bK', sb2: 'bQ', sb3: 'bR', sb4: 'bB', sb5: 'bN', sb6: 'bP'
      };
    ASPECT_RATIO = 0.75;

      // ---------------------------------------------------------------------//
      //                               ANIMATION                              //
      // ---------------------------------------------------------------------//

    executingTweens : any[] = [];
    arguments : any = [];
    startTween(onUpdate:any, onComplete:any, duration:any) {
      this.executingTweens.push({
          onUpdate: onUpdate,
          onComplete: onComplete,
          duration: duration,
          started: window.performance.now()
      });
      onUpdate(0);
  }

  // invoke frequently
  updateAllTweens() {
      let tweenArray : any[] = [];
      this.executingTweens.forEach((tween:any) =>{
          var rightNow = window.performance.now();
          var t = (rightNow - tween.started) / tween.duration;
          if (t < 1) {
              tween.onUpdate(t);
              tweenArray.push(tween);
          } else {
              tween.onUpdate(1.0);
              tween.onComplete();
          }
      });
      this.executingTweens = tweenArray;
  }

  // ---------------------------------------------------------------------//
  //                               UTILITIES                              //
  // ---------------------------------------------------------------------//

  webGLEnabled() {
      try {
          var canvas = document.createElement( 'canvas' );
          return !! (
                  (window.hasOwnProperty('WebGLRenderingContext') && window.WebGLRenderingContext)
                   &&
                  ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl')
              )
          );
      }
      catch ( e ) {
          return false;
      }
  }

  deepCopy(thing:any) {
      return JSON.parse(JSON.stringify(thing));
  }

  validMove(move:any) {
      if (typeof move !== 'string') {
          return false;
      }
      var tmp = move.split('-');
      if (tmp.length !== 2) {
          return false;
      }
      return this.validSquare(tmp[0]) &&this. validSquare(tmp[1]);
  }

  validSquare(square:any) {
      return this.validOrdinarySquare(square) || this.validSpareSquare(square);
  }

  validOrdinarySquare(square:any) {
      if (typeof square !== 'string') return false;
      return (square.search(/^[a-h][1-8]$/) !== -1);
  }

  validSpareSquare(square:any) {
      if (typeof square !== 'string') return false;
      return (square.search(/^s[bw][1-6]$/) !== -1);
  }

  validPieceCode(code:any) {
      if (typeof code !== 'string') {
          return false;
      }
      return (code.search(/^[bw][KQRNBP]$/) !== -1);
  }

  validFen(fen:any) {
      if (typeof fen !== 'string') {
          return false;
      }
      // cut off any move, castling, etc info from the end
      // we're only interested in position information
      fen = fen.replace(/ .+$/, '');

      // FEN should be 8 sections separated by slashes
      var chunks = fen.split('/');
      if (chunks.length !== 8) return false;

      // check the piece sections
      for (var i = 0; i < 8; i++) {
          if (chunks[i] === '' ||
              chunks[i].length > 8 ||
              chunks[i].search(/[^kqrbnpKQRNBP1-8]/) !== -1) {
              return false;
          }
      }

      return true;
  }

  validPositionObject(pos:any) {
      if (typeof pos !== 'object') return false;

      for (var i in pos) {
          if (pos.hasOwnProperty(i) !== true) continue;
          if (this.validSquare(i) !== true || this.validPieceCode(pos[i]) !== true) {
              return false;
          }
      }

      return true;
  }
  // convert FEN piece code to bP, wK, etc
  fenToPieceCode(piece:any) {
      // black piece
      if (piece.toLowerCase() === piece) {
          return 'b' + piece.toUpperCase();
      }

      // white piece
      return 'w' + piece.toUpperCase();
  }

  // convert bP, wK, etc code to FEN structure
  pieceCodeToFen(piece:any) {
      var tmp = piece.split('');

      // white piece
      if (tmp[0] === 'w') {
          return tmp[1].toUpperCase();
      }

      // black piece
      return tmp[1].toLowerCase();
  }
  // convert FEN string to position object
  // returns false if the FEN string is invalid
  fenToObj(fen:any) {
      if (this.validFen(fen) !== true) {
          return false;
      }

      // cut off any move, castling, etc info from the end
      // we're only interested in position information
      fen = fen.replace(/ .+$/, '');

      var rows = fen.split('/');
      var position : any = {};

      var currentRow = 8;
      for (var i = 0; i < 8; i++) {
          var row = rows[i].split('');
          var colIndex = 0;

          // loop through each character in the FEN section
          for (var j = 0; j < row.length; j++) {
              // number / empty squares
              if (row[j].search(/[1-8]/) !== -1) {
                  colIndex += parseInt(row[j], 10);
              }
              // piece
              else {
                  var square = this.COLUMNS[colIndex] + currentRow;
                  position[square] = this.fenToPieceCode(row[j]);
                  colIndex++;
              }
          }

          currentRow--;
      }

      return position;
  }

  // position object to FEN string
  // returns false if the obj is not a valid position object
  objToFen(obj: any) {
      if (this.validPositionObject(obj) !== true) {
          return false;
      }

      var fen = '';

      var currentRow = 8;
      for (var i = 0; i < 8; i++) {
          for (var j = 0; j < 8; j++) {
              var square = this.COLUMNS[j] + currentRow;

              // piece exists
              if (obj.hasOwnProperty(square) === true) {
                  fen += this.pieceCodeToFen(obj[square]);
              }

              // empty space
              else {
                  fen += '1';
              }
          }

          if (i !== 7) {
              fen += '/';
          }

          currentRow--;
      }

      fen = fen.replace(/11111111/g, '8');
      fen = fen.replace(/1111111/g, '7');
      fen = fen.replace(/111111/g, '6');
      fen = fen.replace(/11111/g, '5');
      fen = fen.replace(/1111/g, '4');
      fen = fen.replace(/111/g, '3');
      fen = fen.replace(/11/g, '2');

      return fen;
  }

  START_POSITION = this.fenToObj(this.START_FEN);

  containerEl : any;
  addedToContainer = false;

  widget :any= {};

  RENDERER : any;
  SCENE : any;
  LABELS : any;
  CAMERA : any;
  CAMERA_CONTROLS : any;

  CAMERA_POSITION_WHITE = new THREE.Vector3(0,
       this.CAMERA_DISTANCE * Math.cos(this.CAMERA_POLAR_ANGLE),
       this.CAMERA_DISTANCE * Math.sin(this.CAMERA_POLAR_ANGLE));
  CAMERA_POSITION_BLACK = new THREE.Vector3(0,
   this.CAMERA_DISTANCE * Math.cos(this.CAMERA_POLAR_ANGLE),
       -this.CAMERA_DISTANCE * Math.sin(this.CAMERA_POLAR_ANGLE));

  whitePieceColor = 0xAAAAAA;

  GEOMETRIES  : any = {
    K: undefined,
    Q: undefined,
    R: undefined,
    B: undefined,
    N: undefined,
    P: undefined
};

  //------------------------------------------------------------------------------
  // Stateful
  //------------------------------------------------------------------------------

  ANIMATION_HAPPENING = false;
  RENDER_FLAG = true;
  CURRENT_ORIENTATION = 'white';
  CURRENT_POSITION : any= {};
  SQUARE_MESH_IDS : any = {};
  PIECE_MESH_IDS : any= {};
  DRAG_INFO : any = null;
  SOURCE_SQUARE_HIGHLIGHT_MESH : any = null;
  DESTINATION_SQUARE_HIGHLIGHT_MESH : any = null;
  USER_HIGHLIGHT_MESHES : any = [];
  MOUSEOVER_SQUARE = 'offboard';
  WHITE_MATERIAL : any;
  whitePieceSpecular = 0xCCFFFF;
  blackPieceColor = 0x333333;
  BLACK_MATERIAL : any;
  blackPieceSpecular = 0x553333;
  textColor = 0x000000;
  textMaterial : any;
  darkSquareColor = 0xb68863;
  darkSquareMaterial : any;
  lightSquareColor= 0xf0d9b5;
  lightSquareMaterial : any;
  RANK_1_TEXT_MATERIAL : any;
  RANK_8_TEXT_MATERIAL : any;
  FILE_A_TEXT_MATERIAL : any;
  FILE_H_TEXT_MATERIAL : any;



   constructor(public containerElOrId:any= {},public cfg:any = ''){
    if(this.cfg.hasOwnProperty('whitePieceColor') && typeof this.cfg.whitePieceColor === 'number') {
        this.whitePieceColor = this.cfg.whitePieceColor;
    }
    this.WHITE_MATERIAL = new THREE.MeshPhongMaterial({color: new THREE.Color(this.whitePieceColor)});

    if (this.cfg.hasOwnProperty('whitePieceSpecular') && typeof this.cfg.whitePieceSpecular === 'number') {
        this.whitePieceSpecular = this.cfg.whitePieceSpecular;
    }
    this.WHITE_MATERIAL.specular = new THREE.Color(this.whitePieceSpecular);
    this.WHITE_MATERIAL.transparent = true;

    if (this.cfg.hasOwnProperty('blackPieceColor') && typeof this.cfg.blackPieceColor === 'number') {
        this.blackPieceColor = this.cfg.blackPieceColor;
    }
    this.BLACK_MATERIAL = new THREE.MeshPhongMaterial({color: new THREE.Color(this.blackPieceColor)});

    if (this.cfg.hasOwnProperty('blackPieceSpecular') && typeof this.cfg.blackPieceSpecular === 'number') {
        this.blackPieceSpecular = this.cfg.blackPieceSpecular;
    }
    this.BLACK_MATERIAL.specular = new THREE.Color(this.blackPieceSpecular);
    this.BLACK_MATERIAL.transparent = true;

    if (this.cfg.hasOwnProperty('notationColor') && typeof this.cfg.notationColor === 'number') {
        this.textColor = this.cfg.notationColor;
    }
    this.textMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color(this.textColor)});
    this.textMaterial.transparent = true;

  this.RANK_1_TEXT_MATERIAL = this.textMaterial.clone();
  this.RANK_8_TEXT_MATERIAL = this.textMaterial.clone();
  this.FILE_A_TEXT_MATERIAL = this.textMaterial.clone();
  this.FILE_H_TEXT_MATERIAL = this.textMaterial.clone();


    if (this.cfg.hasOwnProperty('darkSquareColor') && typeof this.cfg.darkSquareColor === 'number') {
      this.darkSquareColor = this.cfg.darkSquareColor;
    }
    this.darkSquareMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color(this.darkSquareColor)});

    if (this.cfg.hasOwnProperty('lightSquareColor') && typeof this.cfg.lightSquareColor === 'number') {
      this.lightSquareColor = this.cfg.lightSquareColor;
    }
    this.lightSquareMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color(this.lightSquareColor)});

      // ---------------------------------------------------------------------//
      //                            PUBLIC METHODS                            //
      // ---------------------------------------------------------------------//

      // clear the board
      this.widget.clear = (useAnimation:any)=> {
        this.widget.position({}, useAnimation);
      };

      // remove the widget from the page
      this.widget.destroy = () =>{
          // remove markup
          this.RENDERER.domElement.removeEventListener('mousedown', this.mouseDown);
          this.RENDERER.domElement.removeEventListener('mousemove', this.mouseMove);
          this.RENDERER.domElement.removeEventListener('mouseup', this.mouseUp);
          this.containerEl.removeChild(this.RENDERER.domElement);
      };

      // Return FEN string of current position
      this.widget.fen = () =>{
          return this.widget.position('fen');
      };

      // flip orientation
      this.widget.flip = () =>{
          return this.widget.orientation('flip');
      };

      // highlight a square from client code
      this.widget.greySquare = (sq:any) =>{
          this.USER_HIGHLIGHT_MESHES.push(this.addSquareHighlight(sq, 0x404040));
          this.RENDER_FLAG = true;
      };

      // clear all highlights set from client code
      this.widget.removeGreySquares = () =>{
          while (this.USER_HIGHLIGHT_MESHES.length > 0) {
            this.SCENE.remove(this.USER_HIGHLIGHT_MESHES.pop());
          }
          this.USER_HIGHLIGHT_MESHES = [];
          this.RENDER_FLAG = true;
      };

      // move pieces
      this.widget.move = ()=> {
          // no need to throw an error here; just do nothing
          if (this.arguments.length === 0) return;
          var useAnimation = true;
          // collect the moves into an object
          var moves: any= {};
          for (var i = 0; i < this.arguments.length; i++) {
              // any "false" to this   means no animations
              if (this.arguments[i] === false) {
                  useAnimation = false;
                  continue;
              }
              // skip invalid arguments
              if (this.validMove(this.arguments[i]) !== true) {
                this.error(2826, 'Invalid move passed to the move method.', this.arguments[i]);
                  continue;
              }
              var tmp = this.arguments[i].split('-');
              moves[tmp[0]] = tmp[1];
          }

          // calculate position from moves
          var newPos = this.calculatePositionFromMoves(this.CURRENT_POSITION, moves);

          // update the board
          this.widget.position(newPos, useAnimation);

          // return the new position object
          return newPos;
      };

      this.widget.orientation = (arg:any) => {
          // no arguments, return the current orientation
          if (arguments.length === 0) {
              return this.CURRENT_ORIENTATION;
          }
          // set to white or black
          if (arg === 'white' || arg === 'black') {
            this.CURRENT_ORIENTATION = arg;
              if (arg === 'white') {
                this.swivelCamera(this.CAMERA_POSITION_WHITE);
              } else {
                this.swivelCamera(this.CAMERA_POSITION_BLACK);
              }
              return this.CURRENT_ORIENTATION;
          }
          // flip orientation
          if (arg === 'flip') {
            this.CURRENT_ORIENTATION = (this.CURRENT_ORIENTATION === 'white') ? 'black' : 'white';
              if (this.CURRENT_ORIENTATION === 'white') {
                this.swivelCamera(this.CAMERA_POSITION_WHITE);
              } else {
                this.swivelCamera(this.CAMERA_POSITION_BLACK);
              }
              return this.CURRENT_ORIENTATION;
          }
          this.error(5482, 'Invalid value passed to the orientation method.', arg);
          return this.CURRENT_ORIENTATION;
      };

      this.widget.flip = ()=> {
        this.widget.orientation('flip');
      };

      this.widget.position = (position:any, useAnimation:any) =>{
          // no arguments, return the current position
          if (arguments.length === 0) {
              return this.deepCopy(this.CURRENT_POSITION);
          }

          // get position as FEN
          if (typeof position === 'string' && position.toLowerCase() === 'fen') {
              return this.objToFen(this.CURRENT_POSITION);
          }

          // default for useAnimations is true
          if (useAnimation !== false) {
              useAnimation = true;
          }

          // start position
          if (typeof position === 'string' && position.toLowerCase() === 'start') {
              position = this.deepCopy(this.START_POSITION);
          }

          // convert FEN to position object
          if (this.validFen(position) === true) {
              position = this.fenToObj(position);
          }

          // validate position object
          if (this.validPositionObject(position) !== true) {
            this.error(6482, 'Invalid value passed to the position method.', position);
              return;
          }

          var doDrawing = ()=> {
              if (useAnimation) {
                  var anims = this.calculateAnimations(this.CURRENT_POSITION, position);
                  this.doAnimations(anims, this.CURRENT_POSITION, position); // invokes setCurrentPosition() from a callback
              } else {
                  // instant update
                  this.setCurrentPosition(position);
                  this.drawPositionInstant();
                  this.RENDER_FLAG = true;
              }
          };

          if (this.checkGeometriesLoaded() && this.ANIMATION_HAPPENING === false) {
              doDrawing(); // normal case
          } else {
              // Someone called position() before the geometries finished loading,
              // or animations are still going
              var keepWaiting = ()=> {
                  if (this.checkGeometriesLoaded() === false || this.ANIMATION_HAPPENING) {
                      setTimeout(keepWaiting, 100);
                  } else {
                      doDrawing();
                  }
              };
              keepWaiting();
          }
      };

      this.widget.resize = ()=> {
          var w = this.containerEl.clientWidth;
          if (this.CAMERA) {
            this.CAMERA.updateProjectionMatrix();
          }
          if (this.RENDERER) {
            this.RENDERER.setSize(w, w * this.ASPECT_RATIO);
          }
          this.RENDER_FLAG = true;
      };

      this.widget.rerender = ()=> {
        this.RENDER_FLAG = true;
      };

      this.widget.start = (useAnimation:any)=> {
        this.widget.position('start', useAnimation);
      };


      this.init();
      return this.widget;

  }



      /*
      darkSquareMaterial.specularMap = THREE.ImageUtils.loadTexture("img/iris.png", undefined, ()=> {SPECULAR_MAPS_PENDING--;};);
      lightSquareMaterial.specularMap = THREE.ImageUtils.loadTexture("img/grain.jpg", undefined, ()=> {SPECULAR_MAPS_PENDING--;};);
      */

      //--------------------
      // Validation / Errors
      //--------------------

        error(code:any, msg:any = null, obj:any = null) {
          // do nothing if showErrors is not set
          var showErrors = this.cfg['showErrors'];
          if (this.cfg.hasOwnProperty('showErrors') !== true ||
              this.cfg['showErrors'] === false) {
              return;
          }

          var errorText = 'ChessBoard3 Error ' + code + ': ' + msg;

          // print to console
          if (this.cfg.hasOwnProperty('showErrors') && this.cfg['showErrors']=== 'console' &&
              typeof console === 'object' &&
              typeof console.log === 'function') {
              console.log(errorText);
              if (arguments.length >= 2) {
                  console.log(obj);
              }
              return;
          }

          if (this.cfg['showErrors'] === 'alert') {
              if (obj) {
                  errorText += '\n\n' + JSON.stringify(obj);
              }
              window.alert(errorText);
              return;
          }

          // custom function
          if (typeof this.cfg['showErrors'] === 'function') {
              this.cfg['showErrors'].call(code, msg, obj);
          }
      }

        checkDeps() {
          // Check for three.js
          if (THREE === undefined || THREE.REVISION === undefined
              || isNaN(parseInt(THREE.REVISION))
              || (parseInt(THREE.REVISION) < this.MINIMUM_THREEJS_REVISION)) {
              console.log("ChessBoard3 Error 3006: Unable to find three.js revision 71 or greater. \n\nExiting...");
              return false;
          }
          if (!this.webGLEnabled()) {
              window.alert("ChessBoard3 Error 3001: WebGL is not enabled.\n\nExiting...");
              return false;
          }
          if (typeof this.containerElOrId === 'string') {
              if (this.containerElOrId === '') {
                  window.alert('ChessBoard3 Error 1001: The first argument to ChessBoard3() cannot be an empty string.\n\nExiting...');
                  return false;
              }
              var el = document.getElementById(this.containerElOrId);
              if (!el) {
                  window.alert('ChessBoard Error 1002: Element with id "' + this.containerElOrId + '"does not exist in the DOM.\n\nExiting...');
                  return false;
              }
              this.containerEl = el;
          } else {
            this.containerEl = this.containerElOrId;
              if (this.containerEl.length !== -1) {
                  window.alert("ChessBoard3 Error 1003: The first argument to ChessBoard3() must be an ID or a single DOM node.\n\nExiting...");
                  return false;
              }
          }
          return true;
      }

        validAnimationSpeed(speed:any) {
          if (speed === 'fast' || speed === 'slow') {
              return true;
          }

          if ((parseInt(speed, 10) + '') !== (speed + '')) {
              return false;
          }

          return (speed >= 0);
      }


      // validate config / set default options
        expandConfig() {
          if (typeof this.cfg === 'string' || this.validPositionObject(this.cfg)) {
              this.cfg = {
                  position: this.cfg
              };
          }

          if (this.cfg.orientation !== 'black') {
              this.cfg.orientation = 'white'
          }
          this.CURRENT_ORIENTATION = this.cfg.orientation;

          if (this.cfg.showNotation !== false) {
              this.cfg.showNotation = true;
              if (this.cfg.hasOwnProperty('fontData') !== true ||
                  (typeof this.cfg.fontData !== 'string' && typeof this.cfg.fontData !== 'function')) {
                  this.cfg.fontData = 'assets/fonts/helvetiker_regular.typeface.json';
              }
          }

          if (this.cfg.draggable !== true) {
              this.cfg.draggable = false;
          }

          if (this.cfg.dropOffBoard !== 'trash') {
              this.cfg.dropOffBoard = 'snapback';
          }

          if (this.cfg.sparePieces !== true) {
              this.cfg.sparePieces = false;
          }

          // draggable must be true if sparePieces is enabled
          if (this.cfg.sparePieces === true) {
              this.cfg.draggable = true;
          }

          // default chess set
          if (this.cfg.hasOwnProperty('pieceSet') !== true ||
              (typeof this.cfg.pieceSet !== 'string' &&
              typeof this.cfg.pieceSet !== 'function')) {
              this.cfg.pieceSet = 'assets/chesspieces/iconic/{piece}.json';
          }

          // rotate and zoom controls
          if (this.cfg.rotateControls !== false) {
              this.cfg.rotateControls = true;
          }
          if (this.cfg.zoomControls !== true) {
              this.cfg.zoomControls = false;
          }


          // animation speeds
          if (this.cfg.hasOwnProperty('appearSpeed') !== true ||
          this.validAnimationSpeed(this.cfg.appearSpeed) !== true) {
              this.cfg.appearSpeed = 200;
          } else if (this.cfg.hasOwnProperty('appearSpeed')) {
              if (this.cfg.appearSpeed === 'slow') {
                  this.cfg.appearSpeed = 400;
              } else if (this.cfg.appearSpeed === 'fast') {
                  this.cfg.appearSpeed = 100;
              }
          }
          if (this.cfg.hasOwnProperty('moveSpeed') !== true ||
          this.validAnimationSpeed(this.cfg.moveSpeed) !== true) {
              this.cfg.moveSpeed = 200;
          } else if (this.cfg.hasOwnProperty('moveSpeed')) {
              if (this.cfg.moveSpeed === 'slow') {
                  this.cfg.moveSpeed = 400;
              } else if (this.cfg.moveSpeed === 'fast') {
                  this.cfg.moveSpeed = 100;
              }
          }
          if (this.cfg.hasOwnProperty('snapbackSpeed') !== true ||
          this.validAnimationSpeed(this.cfg.snapbackSpeed) !== true) {
              this.cfg.snapbackSpeed = 50;
          } else if (this.cfg.hasOwnProperty('snapbackSpeed')) {
              if (this.cfg.snapbackSpeed === 'slow') {
                  this.cfg.snapbackSpeed = 100;
              } else if (this.cfg.snapbackSpeed === 'fast') {
                  this.cfg.snapbackSpeed = 25;
              }
          }
          if (this.cfg.hasOwnProperty('snapSpeed') !== true ||
          this.validAnimationSpeed(this.cfg.snapSpeed) !== true) {
              this.cfg.snapSpeed = 25;
          } else if (this.cfg.hasOwnProperty('snapSpeed')) {
              if (this.cfg.snapSpeed === 'slow') {
                  this.cfg.snapSpeed = 50;
              } else if (this.cfg.snapSpeed === 'fast') {
                  this.cfg.snapSpeed = 10;
              }
          }
          if (this.cfg.hasOwnProperty('trashSpeed') !== true ||
          this.validAnimationSpeed(this.cfg.trashSpeed) !== true) {
              this.cfg.trashSpeed = 100;
          } else if (this.cfg.hasOwnProperty('trashSpeed')) {
              if (this.cfg.trashSpeed === 'slow') {
                  this.cfg.trashSpeed = 200;
              } else if (this.cfg.trashSpeed === 'fast') {
                  this.cfg.trashSpeed = 50;
              }
          }

          // make sure position is valid
          if (this.cfg.hasOwnProperty('position') === true) {
              if (this.cfg.position === 'start') {
                this.CURRENT_POSITION = this.deepCopy(this.START_POSITION);
              }
              else if (this.validFen(this.cfg.position) === true) {
                this.CURRENT_POSITION = this.fenToObj(this.cfg.position);
              }
              else if (this.validPositionObject(this.cfg.position) === true) {
                this.CURRENT_POSITION = this.deepCopy(this.cfg.position);
              }
              else {
                this.error(7263, 'Invalid value passed to config.position.', this.cfg.position);
              }
          }
          return true;
      }

      // three.js scene construction (sans pieces)
        prepareScene() {

          if (this.cfg.orientation !== 'black') {
              this.cfg.orientation = 'white';
          }

          //window.WebGLRenderingContext ? new THREE.WebGLRenderer() : new THREE.CanvasRenderer();
          this.RENDERER = new THREE.WebGLRenderer({
              alpha: true,
              preserveDrawingBuffer: true,
              antialias: true,
              //transparent: true
          });

          var backgroundColor;
          if (this.cfg.hasOwnProperty('backgroundColor') && typeof this.cfg.backgroundColor === 'number') {
              backgroundColor = this.cfg.backgroundColor;
          } else {
              backgroundColor = 0xBBBBBB;
          }
          this.RENDERER.setClearColor(backgroundColor, 1);

          this.RENDERER.setSize(this.containerEl.clientWidth, Math.round(this.containerEl.clientWidth * this.ASPECT_RATIO));

          this.SCENE = new THREE.Scene();
          //SCENE.add(new THREE.AxisHelper(3));

          this.CAMERA = new THREE.PerspectiveCamera(60, this.containerEl.clientWidth / this.containerEl.clientHeight, 0.1, 1000);
          this.CAMERA.aspectRatio = this.ASPECT_RATIO;

          if (this.cfg.sparePieces === false) {
              // no spare pieces, so let's pull a bit closer with this hack
              this.CAMERA_POSITION_WHITE.multiplyScalar(0.9);
              this.CAMERA_POSITION_BLACK.multiplyScalar(0.9);
          }
          if (this.cfg.orientation === 'white') {
            this.CAMERA.position.set(this.CAMERA_POSITION_WHITE.x, this.CAMERA_POSITION_WHITE.y, this.CAMERA_POSITION_WHITE.z);
          } else if (this.cfg.orientation === 'black') {
            this.CAMERA.position.set(this.CAMERA_POSITION_BLACK.x, this.CAMERA_POSITION_BLACK.y, this.CAMERA_POSITION_BLACK.z);
          }

          this.CAMERA.lookAt(new THREE.Vector3(0, -3, 0));

          this.SCENE.add(this.CAMERA);

          this.RENDERER.domElement.addEventListener( 'mousedown', this.mouseDown, true );
          this.RENDERER.domElement.addEventListener( 'mousemove', this.mouseMove, true);
          this.RENDERER.domElement.addEventListener( 'mouseup', this.mouseUp, true);


          if ('ontouchstart' in document.documentElement) {
            this.RENDERER.domElement.addEventListener('touchstart', (e:any) =>{
              this.mouseDown(e, true);
              }, true);
              this.RENDERER.domElement.addEventListener('touchmove', (e:any) =>{
                this.mouseMove(e, true);
              }, true);
              this.RENDERER.domElement.addEventListener('touchend', this.mouseUp, true);
          }

          if (this.cfg.rotateControls || this.cfg.zoomControls) {
              if (OrbitControls !== undefined) {
                  this.CAMERA_CONTROLS = new OrbitControls(this.CAMERA, this.RENDERER.domElement);
                  this.CAMERA_CONTROLS.enablePan = false;
                  if (this.cfg.rotateControls) {
                    this.CAMERA_CONTROLS.minPolarAngle = Math.PI / 2 * 0.1;
                    this.CAMERA_CONTROLS.maxPolarAngle = Math.PI / 2 * 0.8;
                  } else {
                    this.CAMERA_CONTROLS.noRotate = true;
                  }
                  if (this.cfg.zoomControls) {
                    this.CAMERA_CONTROLS.minDistance = 12;
                    this.CAMERA_CONTROLS.maxDistance = 22;
                    this.CAMERA_CONTROLS.enableZoom = true;
                  } else {
                    this.CAMERA_CONTROLS.enableZoom = false;
                  }
                  this.CAMERA_CONTROLS.target.y = -3;
                  this.CAMERA_CONTROLS.enabled = true;
              }
          }
      }

        swivelCamera(targetPosition: any) {
          this.ANIMATION_HAPPENING = true;
          var startPosition = this.CAMERA.position;
          var startY = startPosition.y, targetY = targetPosition.y;
          var startRadius = Math.sqrt(Math.pow(startPosition.x, 2) + Math.pow(startPosition.z, 2));
          var targetRadius =  Math.sqrt(Math.pow(targetPosition.x, 2) + Math.pow(targetPosition.z, 2));
          var startTheta = Math.acos(startPosition.x / startRadius);
          var targetTheta = Math.acos(targetPosition.x / targetRadius);
          if (startPosition.z < 0) {
              startTheta = -startTheta;
          }
          if (targetPosition.z < 0) {
              targetTheta = -targetTheta;
          }
          if (targetTheta - startTheta >= Math.PI || startTheta - targetTheta > Math.PI) {
              if (targetTheta > startTheta) {
                  targetTheta -= 2 * Math.PI;
              } else {
                  targetTheta += 2 * Math.PI;
              }
          }

          var end = () => {
            this.CAMERA.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
            this.CAMERA.lookAt(new THREE.Vector3(0, -3, 0));
            this.ANIMATION_HAPPENING = false;
            this.RENDER_FLAG = true;
          };

          this.startTween((t:any) =>{
              var theta = startTheta + t * (targetTheta - startTheta);
              var r = startRadius + t * (targetRadius - startRadius);
              this.CAMERA.position.set(r * Math.cos(theta),
                  startY + t * (targetY - startY),
                  r * Math.sin(theta));
                  this.CAMERA.lookAt(new THREE.Vector3(0, -3, 0));
          }, end, 1000);
      }

        buildPieceMesh(square:any, piece:any) {

          var coords = this.squareCoordinates(square);

          var color = piece.charAt(0);
          var species = piece.charAt(1);

          var material;
          if (color === 'w') {
              material = this.WHITE_MATERIAL.clone();
          } else if (color === 'b') {
              material = this.BLACK_MATERIAL.clone();
          }

          var geometry : any, mesh : any;
          geometry = this.GEOMETRIES[species];
          geometry.morphAttributes = {};
          mesh = new THREE.Mesh(geometry, material);
          mesh.position.x = coords.x;
          mesh.position.z = coords.z;
          if (color === 'w') {
              mesh.rotation.y = Math.PI;
          }
          mesh.castShadow = true;
          return mesh;
      }

        addLabelsToScene() {

          var loader = new FontLoader();

          var url = null;
          if (typeof this.cfg.fontData === 'function') {
              url = this.cfg.fontData();
          } else if (typeof this.cfg.fontData === 'string') {
              url = this.cfg.fontData;
          }

          if (url === null) {
              this.cfg.showNotation = false;
             // this.error(2354, e);
          }

          loader.load(url, (font:any) =>{

              // Add the file / rank labels
              var opts = {
                  font: font,
                  size: 0.5,
                  height: 0.0,
                  weight: 'normal',
                  style: 'normal',
                  curveSegments: 12,
                  steps: 1,
                  bevelEnabled: false,
                  material: 0,
                  extrudeMaterial: 1
              };

              this.LABELS = [];
              var textGeom;
              var label;
              var columnLabelText = "abcdefgh".split('');
              for (var i = 0; i < 8; i++) {
                  textGeom = new TextGeometry(columnLabelText[i], opts);
                  textGeom.computeBoundingBox();
                  textGeom.computeVertexNormals();
                  label = new THREE.Mesh(textGeom, this.RANK_1_TEXT_MATERIAL);
                  label.position.x = 2 * i - 7 - opts.size/2;
                  label.position.y = -0.5;
                  label.position.z = -9;
                  this.LABELS.push(label);
                  this.SCENE.add(label);
                  label = new THREE.Mesh(textGeom, this.RANK_8_TEXT_MATERIAL);
                  label.position.x = 2 * i - 7 - opts.size/2;
                  label.position.y = -0.5;
                  label.position.z = 9;
                  this.LABELS.push(label);
                  this.SCENE.add(label);
              }
              var rankLabelText = "12345678".split('');
              for (i = 0; i < 8; i++) {
                  textGeom = new TextGeometry(rankLabelText[i], opts);
                  label = new THREE.Mesh(textGeom, this.FILE_A_TEXT_MATERIAL);
                  label.position.x = -9;
                  label.position.y = -0.5;
                  label.position.z = -7 - opts.size / 2 + 2 * (7 - i);
                  this.LABELS.push(label);
                  this.SCENE.add(label);
                  label = new THREE.Mesh(textGeom, this.FILE_H_TEXT_MATERIAL);
                  label.position.x = 9;
                  label.position.y =  -0.5;
                  label.position.z = -7 - opts.size / 2 + 2 * (7 - i);
                  this.LABELS.push(label);
                  this.SCENE.add(label);
              }
          });
      }

        buildBoard() {
          var i;
          for (i = 0; i < 8; i++) {
              var tz = 3.5 * this.SQUARE_SIZE - (this.SQUARE_SIZE * i);
              for (var j = 0; j < 8; j++) {
                  var tx = (this.SQUARE_SIZE * j) - 3.5 * this.SQUARE_SIZE;
                  var square = 'abcdefgh'.charAt(j) + (i + 1);
                  var squareMaterial = (((i % 2) === 0) !== ((j % 2) === 0) ? this.lightSquareMaterial : this.darkSquareMaterial);
                  var squareGeometry: any = new THREE.BoxGeometry(2, 0.5, 2);
                  var squareMesh : any = new THREE.Mesh(squareGeometry, squareMaterial.clone());
                  squareMesh.position.set(tx, -0.25, tz);
                  //squareGeometry.computeFaceNormals();
                  squareGeometry.computeVertexNormals();
                  squareMesh.receiveShadow = true;
                  this.SQUARE_MESH_IDS[square] = squareMesh.id;
                  squareMesh.tag = square;
                  this.SCENE.add(squareMesh);
              }
          }

          if (this.cfg.showNotation) {
              this.addLabelsToScene();
          }

          for (var k = 0; k < this.LIGHT_POSITIONS.length; k++) {
              var light = new THREE.SpotLight(0xAAAAAA);
              var pos = this.LIGHT_POSITIONS[k];
              light.position.set(pos[0], pos[1], pos[2]);
              light.target = new THREE.Object3D();
              if (k===0) {
                  light.castShadow = true;
                  light.shadow.bias = 0.0001;
                  light.shadow.mapSize.width = 2048;
                  light.shadow.mapSize.height = 2048;
              }
              this.SCENE.add(light);
          }
          var ambientLight = new THREE.AmbientLight(0x555555);
          this.SCENE.add(ambientLight);
      }

      // ---------------------------------------------------------------------//
      //                              ANIMATIONS                              //
      // ---------------------------------------------------------------------//

      // Verify that CURRENT_POSITION and PIECE_MESH_IDS are in sync
        checkBoard() {
          for (var sq in this.PIECE_MESH_IDS) {
              if (!this.PIECE_MESH_IDS.hasOwnProperty(sq) || this.validSpareSquare(sq)) {
                  continue;
              }
              if (this.CURRENT_POSITION.hasOwnProperty(sq) === false) {
                this.error(3701, "Square "+sq+" in PIECE_MESH_IDS but not in CURRENT_POSITION");
              } else {
                  if (!this.SCENE.getObjectById(this.PIECE_MESH_IDS[sq])) {
                    this.error(3702, "Mesh not present on square "+sq+", adding a replacement.");
                      var mesh = this.buildPieceMesh(sq, this.CURRENT_POSITION[sq]);
                      this.SCENE.add(mesh);
                      this.PIECE_MESH_IDS[sq] = mesh.id;
                  }
              }
          }
          for (sq in this.CURRENT_POSITION) {
              if (!this.CURRENT_POSITION.hasOwnProperty(sq)) {
                  continue;
              }
              if (this.PIECE_MESH_IDS.hasOwnProperty(sq) === false) {
                this.error(3703, "Square "+sq+" in CURRENT_POSITION but not in PIECE_MESH_IDS");
              }
          }
      }

        animateSquareToSquare(src: any, dest: any, completeFn: any) {
          var destSquareMesh : any, pieceMesh : any;
          if (this.PIECE_MESH_IDS.hasOwnProperty(src)) {
              pieceMesh = this.SCENE.getObjectById(this.PIECE_MESH_IDS[src]);
          }
          if (this.SQUARE_MESH_IDS.hasOwnProperty(dest)) {
              destSquareMesh = this.SCENE.getObjectById(this.SQUARE_MESH_IDS[dest]);
          }
          if (this.validSpareSquare(src)) {
              // this is an animation from a spare square to an ordinary square.
              pieceMesh = pieceMesh.clone();
              this.SCENE.add(pieceMesh);
          }
          if (destSquareMesh && pieceMesh) {
              var tx_src = pieceMesh.position.x, tz_src = pieceMesh.position.z;
              var tx_dest = destSquareMesh.position.x, tz_dest = destSquareMesh.position.z;
              this.startTween((t:any)=> {
                  pieceMesh.position.x = tx_src + t * (tx_dest - tx_src);
                  pieceMesh.position.z = tz_src + t * (tz_dest - tz_src);
              }, ()=>{
                this.PIECE_MESH_IDS[dest] = pieceMesh.id;
                  if (this.validOrdinarySquare(src)) {
                      if (pieceMesh.id === this.PIECE_MESH_IDS[src]) {
                          delete this.PIECE_MESH_IDS[src];
                      }
                  }
                  completeFn();
              }, this.cfg.moveSpeed);
          }
      }

        animatePieceFadeOut(square : any, completeFn : any) {
          if (this.PIECE_MESH_IDS.hasOwnProperty(square)) {
              if (this.validOrdinarySquare(square) && this.PIECE_MESH_IDS.hasOwnProperty(square)) {
                  var mesh = this.SCENE.getObjectById(this.PIECE_MESH_IDS[square]);
                  this.startTween((t: any) =>{
                      mesh.opacity = 1 - t;
                  }, () =>{
                    this.SCENE.remove(mesh);
                      delete this.PIECE_MESH_IDS[square];
                      completeFn();
                  }, this.cfg.trashSpeed);
              }
          }
      }

        animatePieceFadeIn(square: any, piece: any, completeFn: any) {
          var mesh = this.buildPieceMesh(square, piece);
          mesh.opacity = 0;
          this.SCENE.add(mesh);
          this.startTween((t: any) => {
              mesh.opacity = t;
          }, () =>{
              this.PIECE_MESH_IDS[square] = mesh.id;
              completeFn();
          }, this.cfg.appearSpeed);
      }

        doAnimations(a:any, oldPos:any, newPos:any) {
          if (a.length === 0) {
              return;
          }
          this.ANIMATION_HAPPENING = true;
          var numOps = a.length;

         let onFinish = ()=>{
              numOps--;
              if (numOps === 0) {
                  // the last callback to run
                  this.setCurrentPosition(newPos);
                   // run their onMoveEnd callback
                  if (this.cfg.hasOwnProperty('moveEnd') && typeof this.cfg.onMoveEnd === 'function') {
                      this.cfg.onMoveEnd(this.deepCopy(oldPos),this.deepCopy(newPos));
                  }
                  this.RENDER_FLAG = true;
                  this.checkBoard();
                  this.ANIMATION_HAPPENING = false;
              }
          }
          var j;
          for (j = 0; j < a.length; j++) {
              if (a[j].type === 'clear') {
                  if (this.validOrdinarySquare(a[j].square) && this.PIECE_MESH_IDS.hasOwnProperty(a[j].square)) {
                    this.animatePieceFadeOut(a[j].square, onFinish);
                  }
              }
          }
          for (j = 0; j < a.length; j++) {
              if (a[j].type === 'move') {
                this.animateSquareToSquare(a[j].source, a[j].destination, onFinish);
              }
          }
          for (j = 0; j < a.length; j++) {
              if (a[j].type === 'add') {
                  if (this.cfg.sparePieces === true) {
                      for (var sp in this.SPARE_POSITION) {
                          if (!this.SPARE_POSITION.hasOwnProperty(sp)) {
                              continue;
                          }
                          if (this.SPARE_POSITION[sp] === a[j].piece) {
                            this.animateSquareToSquare(sp, a[j].square, onFinish);
                          }
                      }
                  } else {
                      this.animatePieceFadeIn(a[j].square, a[j].piece, onFinish);
                  }
              }
          }
      }

        squareCoordinates(square:any) {
          var tx, tz;
          if (this.validSpareSquare(square)) {
              var u = square.charCodeAt(2) - '1'.charCodeAt(0);
              tx = this.SQUARE_SIZE * (4 * u - 10) / 3;
              if (square.charAt(1) == 'w') {
                  tz = 5 * this.SQUARE_SIZE;

              } else if (square.charAt(1) == 'b') {
                  tz = -5 * this.SQUARE_SIZE;
              }
          } else if (this.validOrdinarySquare(square)) {
              tx = this.SQUARE_SIZE * (square.charCodeAt(0) - 'a'.charCodeAt(0)) - 3.5 * this.SQUARE_SIZE;
              tz = 3.5 * this.SQUARE_SIZE - this.SQUARE_SIZE * (square.charCodeAt(1) - '1'.charCodeAt(0));
          }
          return {
              x : tx,
              z : tz
          }
      }

        pieceOnSquare(sq:any) {
          var position;
          if (this.validSpareSquare(sq)) {
              position = this.SPARE_POSITION;
          } else if (this.validOrdinarySquare(sq)) {
              position = this.CURRENT_POSITION;
          }
          if (!position) {
              return;
          }
          return position[sq];
      }

      // returns the distance between two squares
        squareDistance(s1:any, s2:any) {
          s1 = s1.split('');
          var s1x = this.COLUMNS.indexOf(s1[0]) + 1;
          var s1y = parseInt(s1[1], 10);

          s2 = s2.split('');
          var s2x = this.COLUMNS.indexOf(s2[0]) + 1;
          var s2y = parseInt(s2[1], 10);

          var xDelta = Math.abs(s1x - s2x);
          var yDelta = Math.abs(s1y - s2y);

          if (xDelta >= yDelta) return xDelta;
          return yDelta;
      }

      // returns an array of closest squares from square
        createRadius(square:any) {
          var squares = [];
          var i, j;
          // calculate distance of all squares
          for (i = 0; i < 8; i++) {
              for (j = 0; j < 8; j++) {
                  var s = this.COLUMNS[i] + (j + 1);

                  // skip the square we're starting from
                  if (square === s) continue;

                  squares.push({
                      square: s,
                      distance: this.squareDistance(square, s)
                  });
              }
          }
          // sort by distance
          squares.sort((a, b) =>{
              return a.distance - b.distance;
          });
          // just return the square code
          var squares2 = [];
          for (i = 0; i < squares.length; i++) {
              squares2.push(squares[i].square);
          }
          return squares2;
      }

      // returns the square of the closest instance of piece
      // returns false if no instance of piece is found in position
        findClosestPiece(position:any, piece:any, square:any) {
          // create array of closest squares from square
          var closestSquares = this.createRadius(square);
          // search through the position in order of distance for the piece
          for (var i = 0; i < closestSquares.length; i++) {
              var s = closestSquares[i];
              if (position.hasOwnProperty(s) === true && position[s] === piece) {
                  return s;
              }
          }
          return false;
      }

      // calculate an array of animations that need to happen in order to get from pos1 to pos2
        calculateAnimations(oldPosition:any, newPosition:any) {

          var pos1 = this.deepCopy(oldPosition);
          var pos2 = this.deepCopy(newPosition);

          var animations = [];
          var i;

          // remove pieces that are the same in both positions
          for (i in pos2) {
              if (pos2.hasOwnProperty(i) !== true) continue;

              if (pos1.hasOwnProperty(i) === true && pos1[i] === pos2[i]) {
                  delete pos1[i];
                  delete pos2[i];
              }
          }

          // find all the "move" animations
          for (i in pos2) {
              if (pos2.hasOwnProperty(i) !== true) continue;
              var closestPiece = this.findClosestPiece(pos1, pos2[i], i);
              if (closestPiece !== false) {
                  animations.push({
                      type: 'move',
                      source: closestPiece,
                      destination: i,
                      piece: pos2[i]
                  });
                  delete pos1[closestPiece];
                  delete pos2[i];
              }
          }

          // add pieces to pos2
          for (i in pos2) {
              if (pos2.hasOwnProperty(i) !== true) continue;

              animations.push({
                  type: 'add',
                  square: i,
                  piece: pos2[i]
              });

              delete pos2[i];
          }

          // clear pieces from pos1
          for (i in pos1) {
              if (pos1.hasOwnProperty(i) !== true) continue;
              animations.push({
                  type: 'clear',
                  square: i,
                  piece: pos1[i]
              });

              delete pos1[i];
          }
          return animations;
      }

        pickingRayCaster(mouseX:any, mouseY:any) {
          var vector = new THREE.Vector3((mouseX / this.RENDERER.domElement.width) * 2 - 1,
              1 - (mouseY / this.RENDERER.domElement.height) * 2,
              -0.5);
          vector.unproject(this.CAMERA);
          return new THREE.Raycaster(this.CAMERA.position,
              vector.sub(this.CAMERA.position).normalize());
      }

        projectOntoPlane(mouseX:any, mouseY:any, heightAboveBoard:any) {
          var planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -heightAboveBoard);
          var raycaster:any = this.pickingRayCaster(mouseX, mouseY);
          var pos = raycaster.ray.intersectPlane(planeY);
          if (pos) {
              return new THREE.Vector3(pos.x, heightAboveBoard, pos.z);
          }
          return null;
      }

        isXZOnSquare(x_coord:any, z_coord:any) {
          for (var sq in this.SQUARE_MESH_IDS) {
              if (this.SQUARE_MESH_IDS.hasOwnProperty(sq)) {
                  var squareMesh = this.SCENE.getObjectById(this.SQUARE_MESH_IDS[sq]);
                  if (x_coord >= squareMesh.position.x - this.SQUARE_SIZE / 2
                      && x_coord < squareMesh.position.x + this.SQUARE_SIZE / 2
                      && z_coord >= squareMesh.position.z - this.SQUARE_SIZE / 2
                      && z_coord < squareMesh.position.z + this.SQUARE_SIZE / 2) {
                      return sq;
                  }
              }
          }

          if (this.cfg.sparePieces) {
              // Return "spare square" code, e.g. sw1, sb2, sw3 etc.
              var colorcode;
              if (z_coord >= 4 * this.SQUARE_SIZE && z_coord <= 6 * this.SQUARE_SIZE) {
                  colorcode = 'w';
              } else if (z_coord <= -4 * this.SQUARE_SIZE && z_coord >= -6 * this.SQUARE_SIZE) {
                  colorcode = 'b';
              } else {
                  return 'offboard';
              }
              var u = Math.round(1 + ((10 - 3 * x_coord / this.SQUARE_SIZE) / 4));
              if (u >= 1 && u <= 6) {
                  sq = 's' + colorcode + u;
                  return sq;
              }
          }
          return 'offboard';
      }

      // Checks ray collisions with board or pieces
        raycast(mouseX:any, mouseY:any) {

          var raycaster : any = this.pickingRayCaster(mouseX, mouseY);

          var possibleHits:any = {};
          var meshes = [];
          var count = 0;
          var intersection;
          var sq, piece, mesh;
          for (sq in this.PIECE_MESH_IDS) {
              if (!this.PIECE_MESH_IDS.hasOwnProperty(sq)) {
                  continue;
              }
              piece = this.PIECE_MESH_IDS[sq];
              if (!piece) {
                  continue;
              }
              var pieceMesh = this.SCENE.getObjectById(this.PIECE_MESH_IDS[sq]);
              piece = this.pieceOnSquare(sq);
              var pieceBoundingBox = this.GEOMETRIES[piece.charAt(1)].boundingBox.clone();
              pieceBoundingBox.min.x += pieceMesh.position.x;
              pieceBoundingBox.max.x += pieceMesh.position.x;
              pieceBoundingBox.min.z += pieceMesh.position.z;
              pieceBoundingBox.max.z += pieceMesh.position.z;

              intersection = raycaster.ray.intersectBox(pieceBoundingBox);

              if (intersection) {
                possibleHits[sq] = intersection;
                  meshes.push(pieceMesh);
                  count++;
              }
          }
          if (meshes.length > 0) {
              if (meshes.length === 1) {
                  // we hit one piece's bounding box; just take a shortcut and assume an exact hit:
                  sq = Object.keys(possibleHits)[0];
                  intersection = possibleHits[sq];
                  mesh = meshes[0];
                  return {
                      source : sq,
                      location : sq,
                      piece : this.pieceOnSquare(sq),
                      mesh : mesh,
                      intersection_point : intersection,
                      off_center_x : intersection.x - mesh.position.x,
                      off_center_z : intersection.z - mesh.position.z
                  };
              }
              // Check piece meshes to see which mesh is closest to camera
              // The intersectObjects() call is more expensive than the call to intersectBox()
              var intersects = raycaster.intersectObjects(meshes);
              if (intersects.length > 0) {
                  for (sq in possibleHits) {
                      if (possibleHits.hasOwnProperty(sq)) {
                          mesh = this.SCENE.getObjectById(this.PIECE_MESH_IDS[sq]);
                          if (mesh === intersects[0].object) {
                              intersection = intersects[0].point;
                              return {
                                  source : sq,
                                  location : sq,
                                  piece : this.pieceOnSquare(sq),
                                  mesh : mesh,
                                  intersection_point : intersection,
                                  off_center_x : intersection.x - mesh.position.x,
                                  off_center_z : intersection.z - mesh.position.z
                              };
                          }
                      }
                  }
              }
          }

          // We didn't hit an actual piece mesh. Did we hit anything, like a square, empty or not?
          var pos = this.projectOntoPlane(mouseX, mouseY, 0);
          if (!pos) {
              return {
                  source : 'offboard',
                  location: 'offboard'
              }
          }
          sq = this.isXZOnSquare(pos.x, pos.z);
          piece = this.pieceOnSquare(sq);
          mesh = this.SCENE.getObjectById(this.PIECE_MESH_IDS[sq]);
          return {
              source : sq,
              location : sq,
              piece : piece,
              mesh : mesh,
              intersection_point : new THREE.Vector3(pos.x, 0, pos.z),
              off_center_x : (mesh ? pos.x - mesh.position.x : undefined),
              off_center_z : (mesh ? pos.z - mesh.position.z : undefined)
          }
      }

        updateLocation(raycast:any, mouse_x:any, mouse_y:any) {
          var pos = this.projectOntoPlane(mouse_x, mouse_y, raycast.intersection_point.y);
          if (!pos) {
              return; // ray parallel to xz plane
          }
          pos.x -= raycast.off_center_x;
          pos.z -= raycast.off_center_z;
          raycast.location = this.isXZOnSquare(pos.x, pos.z);
          if (raycast.mesh.position.x !== pos.x || raycast.mesh.position.z !== pos.z) {
              raycast.mesh.position.x = pos.x;
              raycast.mesh.position.z = pos.z;
          }
      }

        drawSparePieces() {
          for (var sq in this.SPARE_POSITION) {
              if (!this.SPARE_POSITION.hasOwnProperty(sq)) {
                  continue;
              }
              var piece = this.SPARE_POSITION[sq];
              var mesh = this.buildPieceMesh(sq, piece);
              mesh.position.y = -0.5; // board thickness
              this.PIECE_MESH_IDS[sq] = mesh.id;
              this.SCENE.add(mesh);
          }
      }

        snapbackDraggedPiece() {
          this.removeSquareHighlights();
          if (this.validSpareSquare(this.DRAG_INFO.source)) {
            this.SCENE.remove(this.DRAG_INFO.mesh);
            this.DRAG_INFO = null;
          } else {
              var tx_start = this.DRAG_INFO.mesh.position.x;
              var tz_start = this.DRAG_INFO.mesh.position.z;
              var squareMesh = this.SCENE.getObjectById(this.SQUARE_MESH_IDS[this.DRAG_INFO.source]);
              var tx_target = squareMesh.position.x;
              var tz_target = squareMesh.position.z;
              var end = ()=> {
                this.DRAG_INFO.mesh.position.x = tx_target;
                this.DRAG_INFO.mesh.position.z = tz_target;
                  var piece = this.DRAG_INFO.piece, source = this.DRAG_INFO.source;
                  this.DRAG_INFO = null;
                  if (this.cfg.hasOwnProperty('onSnapbackEnd') && typeof this.cfg.onSnapbackEnd === 'function') {
                      this.cfg.onSnapbackEnd(piece, source, this.deepCopy(this.CURRENT_POSITION), this.CURRENT_ORIENTATION);
                  }
                  this.ANIMATION_HAPPENING = false;
                  this.RENDER_FLAG = true;
              };
              this.startTween((t: any) =>{
                this.DRAG_INFO.mesh.position.x = tx_start + t * (tx_target - tx_start);
                this.DRAG_INFO.mesh.position.z = tz_start + t * (tz_target - tz_start);
              }, end, 100);
          }
      }

        trashDraggedPiece() {
          this.removeSquareHighlights();
          this.SCENE.remove(this.DRAG_INFO.mesh);
          if (this.validOrdinarySquare(this.DRAG_INFO.source)) {
              var position = this.deepCopy(this.CURRENT_POSITION);
              delete position[this.DRAG_INFO.source];
              this.setCurrentPosition(position);
              delete this.PIECE_MESH_IDS[this.DRAG_INFO.source];
          }
          this.DRAG_INFO = null;
      }

        dropDraggedPieceOnSquare() {
          this.removeSquareHighlights();
          var newPosition = this.deepCopy(this.CURRENT_POSITION);
          var squareMesh = this.SCENE.getObjectById(this.SQUARE_MESH_IDS[this.DRAG_INFO.location]);
          this.DRAG_INFO.mesh.position.x = squareMesh.position.x;
          this.DRAG_INFO.mesh.position.z = squareMesh.position.z;
          if (this.validOrdinarySquare(this.DRAG_INFO.source)) {
              delete newPosition[this.DRAG_INFO.source];
              delete this.PIECE_MESH_IDS[this.DRAG_INFO.source];
          }
          if (newPosition[this.DRAG_INFO.location]) {
            this.SCENE.remove(this.SCENE.getObjectById(this.PIECE_MESH_IDS[this.DRAG_INFO.location]));
          }
          newPosition[this.DRAG_INFO.location] = this.DRAG_INFO.piece;
          this.PIECE_MESH_IDS[this.DRAG_INFO.location] = this.DRAG_INFO.mesh.id;
          var src = this.DRAG_INFO.source, tgt = this.DRAG_INFO.location, piece = this.DRAG_INFO.piece;
          this.DRAG_INFO = null;
          this.setCurrentPosition(newPosition);
          if (this.cfg.hasOwnProperty('onSnapEnd') && typeof this.cfg.onSnapEnd === 'function') {
              this.cfg.onSnapEnd(src, tgt, piece);
          }
      }

      // ---------------------------------------------------------------------//
      //                             CONTROL FLOW                             //
      // ---------------------------------------------------------------------//

        drawPositionInstant() {
          for (var sq in this.PIECE_MESH_IDS) {
              if (this.PIECE_MESH_IDS.hasOwnProperty(sq) !== true) {
                  continue;
              }
              if (this.validSpareSquare(sq)) {
                  continue; // leave spare pieces
              }
              this.SCENE.remove(this.SCENE.getObjectById(this.PIECE_MESH_IDS[sq]));
              delete this.PIECE_MESH_IDS[sq];
          }
          // add new meshes
          for (var square in this.CURRENT_POSITION) {
              if (this.CURRENT_POSITION.hasOwnProperty(square) !== true) {
                  continue;
              }
              var mesh = this.buildPieceMesh(square, this.CURRENT_POSITION[square]);
              this.PIECE_MESH_IDS[square] = mesh.id;
              this.SCENE.add(mesh);
          }
      }

        drawBoard() {
          if (this.cfg.sparePieces) {
            this.drawSparePieces();
          }
          this.drawPositionInstant();
      }

      // given a position and a set of moves, return a new position with the moves executed
        calculatePositionFromMoves(position:any, moves:any) {
          position = this.deepCopy(position);
          for (var i in moves) {
              if (moves.hasOwnProperty(i) !== true) continue;

              // skip the move if the position doesn't have a piece on the source square
              if (position.hasOwnProperty(i) !== true) continue;

              var piece = position[i];
              delete position[i];
              position[moves[i]] = piece;
          }
          return position;
      }

        setCurrentPosition(position:any) {
          var oldPos = this.deepCopy(this.CURRENT_POSITION);
          var newPos = this.deepCopy(position);
          var oldFen = this.objToFen(oldPos);
          var newFen = this.objToFen(newPos);
          if (oldFen === newFen) {
              return;
          }
          if (this.cfg.hasOwnProperty('onChange') && typeof this.cfg.onChange === 'function') {
              this.cfg.onChange(oldPos, newPos);
          }
          this.CURRENT_POSITION = position;
      }

        addSquareHighlight(sq:any, color:any = null) {
          if (!color) {
              color = 0xFFFF00;
          }
          var squareMesh = this.SCENE.getObjectById(this.SQUARE_MESH_IDS[sq]);
          var highlightMesh = null;
          if (squareMesh) {
              var highlight_geometry = new THREE.TorusGeometry(1.2 * this.SQUARE_SIZE / 2, 0.1, 4, 4);
              highlightMesh = new THREE.Mesh(highlight_geometry, new THREE.MeshBasicMaterial({color: new THREE.Color(color)}));
              highlightMesh.position.x = squareMesh.position.x;
              highlightMesh.position.y = 0;
              highlightMesh.position.z = squareMesh.position.z;
              highlightMesh.rotation.z = Math.PI / 4;
              highlightMesh.rotation.x = Math.PI / 2;
              this.SCENE.add(highlightMesh);
          }
          return highlightMesh;
      }

        removeSourceHighlight() {
          if (this.SOURCE_SQUARE_HIGHLIGHT_MESH) {
            this.SCENE.remove(this.SOURCE_SQUARE_HIGHLIGHT_MESH);
            this.SOURCE_SQUARE_HIGHLIGHT_MESH = null;
          }
      }

        removeDestinationHighlight() {
          if (this.DESTINATION_SQUARE_HIGHLIGHT_MESH) {
            this.SCENE.remove(this.DESTINATION_SQUARE_HIGHLIGHT_MESH);
            this. DESTINATION_SQUARE_HIGHLIGHT_MESH = null;
          }
      }

        removeSquareHighlights() {
          this.removeSourceHighlight();
          this.removeDestinationHighlight();
          this.widget.removeGreySquares();
      }

        highlightSourceSquare(sq:any) {
          this.removeSourceHighlight();
          this.SOURCE_SQUARE_HIGHLIGHT_MESH = this.addSquareHighlight(sq);
      }

        highlightDestinationSquare(sq:any) {
          this.removeDestinationHighlight();
          this.DESTINATION_SQUARE_HIGHLIGHT_MESH = this.addSquareHighlight(sq);
      }

        beginDraggingPiece() {
          if (this.CAMERA_CONTROLS) {
            this.CAMERA_CONTROLS.enabled = false;
          }
          if (this.cfg.hasOwnProperty('onDragStart') && typeof this.cfg.onDragStart === 'function' &&
              this.cfg.onDragStart(this.DRAG_INFO.source,
                this.DRAG_INFO.piece,
                this.deepCopy(this.CURRENT_POSITION),
                this.CURRENT_ORIENTATION) === false) {
                  this.DRAG_INFO = null;
              return;
          }
          if (this.validSpareSquare(this.DRAG_INFO.source)) {
              // dragging a spare piece
              this.DRAG_INFO.mesh = this.DRAG_INFO.mesh.clone();
              this.DRAG_INFO.mesh.position.y = 0; // lift spare piece onto the board
              this.SCENE.add(this.DRAG_INFO.mesh);
              this.RENDER_FLAG = true;
          } else if (this.validOrdinarySquare(this.DRAG_INFO.source)) {
              // dragging an ordinary piece
              this.highlightSourceSquare(this.DRAG_INFO.source);
          }
      }

        updateDraggedPiece(mouse_x:any, mouse_y:any) {
          var priorLocation = this.DRAG_INFO.location;
          this.updateLocation(this.DRAG_INFO, mouse_x, mouse_y);
          //DRAG_INFO.updateLocation(mouse_x, mouse_y);
          if (priorLocation !== this.DRAG_INFO.location) {
            this.removeDestinationHighlight();
              if (this.validOrdinarySquare(this.DRAG_INFO.location) && this.DRAG_INFO.location !== this.DRAG_INFO.source) {
                this.highlightDestinationSquare(this.DRAG_INFO.location);
              }
          }
          if (this.cfg.hasOwnProperty('onDragMove') && typeof this.cfg.onDragMove === 'function') {
              this.cfg.onDragMove(this.DRAG_INFO.location, priorLocation, this.DRAG_INFO.source, this.DRAG_INFO.piece,
                this.deepCopy(this.CURRENT_POSITION), this.CURRENT_ORIENTATION);
          }
      }

        stopDraggedPiece() {
          var action = 'drop';
          if (this.DRAG_INFO.location === 'offboard'
              || this.validSpareSquare(this.DRAG_INFO.location)) {
              if (this.cfg.dropOffBoard === 'snapback') {
                  action = 'snapback';
              }
              if (this.cfg.dropOffBoard === 'trash') {
                  action = 'trash';
              }
          }

          // Call onDrop on event handlers, possibly changing action
          if (this.cfg.hasOwnProperty('onDrop') && typeof this.cfg.onDrop === 'function') {
              var newPosition = this.deepCopy(this.CURRENT_POSITION);

              // source piece is a spare piece and destination is on the board
              if (this.validSpareSquare(this.DRAG_INFO.source) && this.validOrdinarySquare(this.DRAG_INFO.location)) {
                  newPosition[this.DRAG_INFO.location] = this.DRAG_INFO.piece;
              }
              // source piece was on the board and destination is off the board
              if (this.validOrdinarySquare(this.DRAG_INFO.source) && !this.validOrdinarySquare(this.DRAG_INFO.location)) {
                  delete newPosition[this.DRAG_INFO.source];
              }
              // Both source piece and destination are on the board
              if (this.validOrdinarySquare(this.DRAG_INFO.source) && this.validOrdinarySquare(this.DRAG_INFO.location)) {
                  delete newPosition[this.DRAG_INFO.source];
                  newPosition[this.DRAG_INFO.location] = this.DRAG_INFO.piece;
              }
              var oldPosition = this.deepCopy(this.CURRENT_POSITION);
              var result = this.cfg.onDrop(this.DRAG_INFO.source, this.DRAG_INFO.location, this.DRAG_INFO.piece, newPosition, oldPosition, this.CURRENT_ORIENTATION);
              if (result === 'snapback' || result === 'trash') {
                  action = result;
              }
          }

          if (action === 'snapback') {
            this.snapbackDraggedPiece();
          }
          else if (action === 'trash') {
            this.trashDraggedPiece();
          }
          else if (action === 'drop') {
            this.dropDraggedPieceOnSquare();
          }
          if (this.CAMERA_CONTROLS) {
            this.CAMERA_CONTROLS.enabled = true;
          }
          this.RENDER_FLAG = true;
          this.removeSquareHighlights();
      }
 // ---------------------------------------------------------------------//
      //                            BROWSER EVENTS                            //
      // ---------------------------------------------------------------------//

      offset(e:any, useTouchObject:any) {
        var target = e.target || e.srcElement,
            rect = target.getBoundingClientRect();
        var offsetX, offsetY;
        if (useTouchObject && e.touches.length > 0) {
            offsetX = e.touches[0].clientX - rect.left;
            offsetY = e.touches[0].clientY - rect.top;
        } else {
            offsetX = e.clientX - rect.left,
            offsetY = e.clientY - rect.top;
        }
        return {
            x: offsetX,
            y: offsetY
        };
    }

      mouseDown(e:any, useTouchObject:any) {
        e.preventDefault();
        if (this.DRAG_INFO) {
            return;
        }
        if (!this.cfg.draggable) {
            return;
        }
        var coords = this.offset(e, useTouchObject);
        var dragged = this.raycast(coords.x, coords.y);
        if (dragged && dragged.piece !== undefined) {
          this.DRAG_INFO = dragged;
          this.MOUSEOVER_SQUARE = 'offboard';
          this.beginDraggingPiece();
        } else {
            if (this.CAMERA_CONTROLS) {
              this.CAMERA_CONTROLS.enabled = true;
            }
        }
    }

      mouseMove(e:any, useTouchObject:any) {
        e.preventDefault();
        var coords = this.offset(e, useTouchObject);
        if (this.DRAG_INFO) {
          this.updateDraggedPiece(coords.x, coords.y);
        } else {
            // Support onMouseOutSquare() and mouseOverSquare() callbacks if they exist
            var callOut, callOver;
            if (this.cfg.hasOwnProperty('onMouseoutSquare') && typeof (this.cfg.onMouseoutSquare) === 'function') {
                callOut = this.cfg.onMouseoutSquare;
            }
            if (this.cfg.hasOwnProperty('onMouseoverSquare') && typeof (this.cfg.onMouseoverSquare) === 'function') {
                callOver = this.cfg.onMouseoverSquare;
            }
            if (callOut || callOver) {
                var rc:any = this.raycast(coords.x, coords.y).source;
                var currentPosition = this.deepCopy(this.CURRENT_POSITION);
                if (rc && rc.source && rc.source !== this.MOUSEOVER_SQUARE) {
                    var currentSquare = rc.source;
                    var piece;
                    if (callOut && this.validOrdinarySquare(this.MOUSEOVER_SQUARE)) {
                        piece = false;
                        if (currentPosition.hasOwnProperty(this.MOUSEOVER_SQUARE)) {
                            piece = currentPosition[this.MOUSEOVER_SQUARE];
                        }
                        callOut(this.MOUSEOVER_SQUARE, piece, currentPosition, this.CURRENT_ORIENTATION);
                    }
                    if (callOver && this.validOrdinarySquare(currentSquare)) {
                        piece = false;
                        if (currentPosition.hasOwnProperty(currentSquare)) {
                            piece = currentPosition[currentSquare];
                        }
                        callOver(currentSquare, piece, currentPosition, this.CURRENT_ORIENTATION);
                    }
                    this.MOUSEOVER_SQUARE = currentSquare;
                }
            }
        }
    }

      mouseUp(e:any) {
        e.preventDefault();
        if (this.DRAG_INFO) {
          this.stopDraggedPiece();
        }
    }

      // ---------------------------------------------------------------------//
      //                            INITIALIZATION                            //
      // ---------------------------------------------------------------------//

        loadGeometry(name:any) {
          var url :any;
          if (typeof this.cfg.pieceSet === 'function') {
              url = this.cfg.pieceSet(name);
          } else if (typeof this.cfg.pieceSet === 'string') {
              var pieceSet = this.cfg.pieceSet;
              url = pieceSet.replace("{piece}", name);
          }
          var loader = new OBJLoader();
          if (this.cfg.hasOwnProperty('localStorage') && this.cfg.localStorage === false) {
              window.localStorage.removeItem(url);
          }
          var json = window.localStorage.getItem(url);
          if (json) {
              var loadedGeometry = JSON.parse(json);
              console.log(loadedGeometry);
              var result : any = loader.parse(loadedGeometry);
              this.GEOMETRIES[name] = result.geometry;
              this.GEOMETRIES[name].computeBoundingBox();
          }
          // else {
          //     loader.load(url,(geometry:any)=> {
          //       this.GEOMETRIES[name] = geometry;
          //         // geometry.computeBoundingBox();
          //         if (this.cfg.hasOwnProperty('localStorage') === false || this.cfg.localStorage !== false) {
          //             window.localStorage.setItem(url, JSON.stringify(geometry.toJSON()));
          //         }
          //     });
          // }
      }

        checkGeometriesLoaded() {
          return this.GEOMETRIES.P !== undefined
              && this.GEOMETRIES.N !== undefined
              && this.GEOMETRIES.B !== undefined
              && this.GEOMETRIES.R !== undefined
              && this.GEOMETRIES.Q !== undefined
              && this.GEOMETRIES.K !== undefined;
      }

        init() {
          if (this.checkDeps() !== true ||
          this.expandConfig() !== true) {
              return;
          }
          this.widget.resize();
          this.prepareScene();
          this.buildBoard();
          this.loadGeometry('K');
          this.loadGeometry('Q');
          this.loadGeometry('R');
          this.loadGeometry('B');
          this.loadGeometry('N');
          this.loadGeometry('P');

          let checkInitialization = () =>{
              if (this.checkGeometriesLoaded()) {
                this.drawBoard();
               animate();
              } else {
                  setTimeout(checkInitialization, 20);
              }
          }
          checkInitialization();

          let animate = () =>{
              requestAnimationFrame(animate);
              this.updateAllTweens();
              var cameraPosition = this.CAMERA.position.clone();
              if (this.CAMERA_CONTROLS && this.CAMERA_CONTROLS.enabled) {
                this.CAMERA_CONTROLS.update();
              }
              var cameraMoved = (this.CAMERA.position.x !== cameraPosition.x
              || this.CAMERA.position.y !== cameraPosition.y
              || this.CAMERA.position.z !== cameraPosition.z);

              if (this.RENDER_FLAG || cameraMoved) {
                  var x = this.CAMERA.position.x, y = this.CAMERA.position.y, z = this.CAMERA.position.z;
                  for (var i in this.LABELS) {
                      if (!this.LABELS.hasOwnProperty(i)) {
                          continue;
                      }
                      this.LABELS[i].lookAt(new THREE.Vector3(100 * x, 100 * y, 100 * z));
                  }
                  if (x <= -8) {
                    this.FILE_A_TEXT_MATERIAL.opacity = 1;
                    this.FILE_H_TEXT_MATERIAL.opacity = 0;
                  } else if (x >= 8) {
                    this.FILE_A_TEXT_MATERIAL.opacity = 0;
                    this.FILE_H_TEXT_MATERIAL.opacity = 1;
                  } else {
                    this.FILE_A_TEXT_MATERIAL.opacity = this.FILE_H_TEXT_MATERIAL.opacity = 1;
                  }
                  if (z <= -8) {
                    this.RANK_1_TEXT_MATERIAL.opacity = 1;
                    this.RANK_8_TEXT_MATERIAL.opacity = 0;
                  } else if (z >= 8) {
                    this.RANK_1_TEXT_MATERIAL.opacity = 0;
                    this.RANK_8_TEXT_MATERIAL.opacity = 1;
                  } else {
                    this.RANK_1_TEXT_MATERIAL.opacity = this.RANK_8_TEXT_MATERIAL.opacity = 1;
                  }
              }
              if (this.RENDER_FLAG || this.DRAG_INFO !== null || this.ANIMATION_HAPPENING || cameraMoved) {
                  var goahead = true;
                  if (this.cfg.hasOwnProperty('onRender') && typeof this.cfg.onRender === 'function') {
                      if (this.cfg.onRender(this.SCENE, this.deepCopy(this.SQUARE_MESH_IDS), this.deepCopy(this.PIECE_MESH_IDS), this.deepCopy(this.CURRENT_POSITION)) === false) {
                          goahead = false;
                      }
                  }
                  if (goahead) {
                      if (!this.addedToContainer) {
                          while (this.containerEl.firstChild) {
                            this.containerEl.removeChild(this.containerEl.firstChild);
                          }
                          this.containerEl.appendChild(this.RENDERER.domElement);
                          this.addedToContainer = true;
                      }
                      this.RENDERER.render(this.SCENE, this.CAMERA);
                      this.RENDER_FLAG = false;
                  } else {
                    this.RENDER_FLAG = true;
                  }
              }
          }
      }

}
