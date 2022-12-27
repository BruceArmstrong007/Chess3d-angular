import { Component } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

import { environment } from 'src/environments/environment';
import { ViewChild } from '@angular/core';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  @ViewChild("cmp") container : any;
  scene : any;
  camera : any;
  renderer : any;
  type = 'classic';
  controls : any;
  speed : any = 200;
  SQUARE_MESH_IDS:any = [];
  RENDER_FLAG = true;
  GEOMETRIES : any = [];
  SCALINGS : any = [];
  SQUARE_SIZE = 3;
  textColor = 0x000000;
  LABELS : any = [];
  SPARE_POSITION : any = {
    sw1 : 'wK', sw2: 'wQ', sw3: 'wR', sw4: 'wB', sw5: 'wN', sw6: 'wP',
    sb1 : 'bK', sb2: 'bQ', sb3: 'bR', sb4: 'bB', sb5: 'bN', sb6: 'bP'
  };
  PIECE_MESH_IDS : any = {};
  whitePieceColor = 0xAAAAAA;
  blackPieceColor = 0x333333;
  WHITE_MATERIAL :any;
  BLACK_MATERIAL :any;
  CURRENT_POSITION : any= {};
  executingTweens : any[] = [];
  START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  widget : any = {};
  START_POSITION : any;
  alphaLabelText = "abcdefgh".split('');
  numericLabelText = "12345678".split('');
  ANIMATION_HAPPENING = false;
  startTween : any;

  constructor(){
    this.WHITE_MATERIAL = new THREE.MeshPhongMaterial({color: new THREE.Color(this.whitePieceColor)});
    this.BLACK_MATERIAL = new THREE.MeshPhongMaterial({color: new THREE.Color(this.blackPieceColor)});
    this.START_POSITION = this.fenToObj(this.START_FEN);
    this.startTween = (onUpdate:any, onComplete:any, duration:any) =>{
      this.executingTweens.push({
          onUpdate: onUpdate,
          onComplete: onComplete,
          duration: duration,
          started: window.performance.now()
      });
      onUpdate(0);
  }
  }

  ngAfterViewInit() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,1,1000);
    this.camera.position.y = 10;
    this.camera.position.z = 25;
    this.renderer = new THREE.WebGLRenderer({antialias:true, alpha: true });
    this.renderer.setSize(this.container.nativeElement.offsetWidth, this.container.nativeElement.offsetHeight);
    this.container.nativeElement.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 50;
    this.controls.enableZoom = true;
    this.buildBoard();
    this.loadPieces();
    this.setWidget();
    this.animateFrames();
  }

  loadPieces(){
  let loader = new GLTFLoader();
  loader.load(
    './../assets/chesspieces/chess.glb',
     (gltf :any)=> {
      let k = gltf.scene.children.find((mesh:any)=> mesh?.name == 'king');
      this.GEOMETRIES['K'] = k?.geometry;
      this.SCALINGS['K'] = {scale : k?.scale, position : k?.position};
      this.GEOMETRIES['K'].computeBoundingBox();

      let q = gltf.scene.children.find((mesh:any)=> mesh?.name == 'queen');
      this.GEOMETRIES['Q'] = q?.geometry;
      this.SCALINGS['Q'] =  {scale : q?.scale, position : q?.position};
      this.GEOMETRIES['Q'].computeBoundingBox();

      let n = gltf.scene.children.find((mesh:any)=> mesh?.name == 'knight');
      this.GEOMETRIES['N'] = n?.geometry;
      this.SCALINGS['N'] =  {scale : n?.scale, position : n?.position};
      this.GEOMETRIES['N'].computeBoundingBox();

      let r = gltf.scene.children.find((mesh:any)=> mesh?.name == 'rook');
      this.GEOMETRIES['R'] = r?.geometry;
      this.SCALINGS['R'] =  {scale : r?.scale, position : r?.position};
      this.GEOMETRIES['R'].computeBoundingBox();

      let p = gltf.scene.children.find((mesh:any)=> mesh?.name == 'pawn');
      this.GEOMETRIES['P'] = p?.geometry;
      this.SCALINGS['P'] =  {scale : p?.scale, position : p?.position};
      this.GEOMETRIES['P'].computeBoundingBox();

      let b = gltf.scene.children.find((mesh:any)=> mesh?.name == 'bishop');
      this.GEOMETRIES['B'] = b?.geometry;
      this.SCALINGS['B'] =  {scale : b?.scale, position : b?.position};
      this.GEOMETRIES['B'].computeBoundingBox();

    this.drawSparePieces();
    this.widget.start(true)
    },
    // called while loading is progressing
    function ( xhr ) {
      console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    },
    // called when loading has errors
    function ( error ) {
      console.log( 'An error happened' );
    }
  );
  }



buildBoard() {
  var i;

  let darkSquareColor = 0xb68863;
  let lightSquareColor= 0xf0d9b5;
  let lightSquareMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color(lightSquareColor)});
  let darkSquareMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color(darkSquareColor)});

  for (i = 0; i < 8; i++) {
      var tz = 3.5 * this.SQUARE_SIZE - (this.SQUARE_SIZE * i);
      for (var j = 0; j < 8; j++) {
          var tx = (this.SQUARE_SIZE * j) - 3.5 * this.SQUARE_SIZE;
          var square = 'abcdefgh'.charAt(j) + (i + 1);

          var squareMaterial = (((i % 2) === 0) !== ((j % 2) === 0) ? lightSquareMaterial : darkSquareMaterial);
          var squareGeometry: any = new THREE.BoxGeometry(this.SQUARE_SIZE, 0.5, this.SQUARE_SIZE);
          var squareMesh : any = new THREE.Mesh(squareGeometry, squareMaterial.clone());
          squareMesh.position.set(tx, -0.25, tz);
          squareGeometry.computeVertexNormals();
          squareMesh.receiveShadow = true;
          this.SQUARE_MESH_IDS[square] = squareMesh.id;
          squareMesh.tag = square;
          this.scene.add(squareMesh);
      }
  }
  let LIGHT_POSITIONS = [
    [50, 40, 30],
    [-50, 0, -30] // place at y=0 to avoid double phong reflection off the board
  ];
  for (var k = 0; k < LIGHT_POSITIONS.length; k++) {
      var light = new THREE.SpotLight(0xAAAAAA);
      var pos = LIGHT_POSITIONS[k];
      light.position.set(pos[0], pos[1], pos[2]);
      light.target = new THREE.Object3D();
      if (k===0) {
          light.castShadow = true;
          light.shadow.bias = 0.0001;
          light.shadow.mapSize.width = 2048;
          light.shadow.mapSize.height = 2048;
      }
      this.scene.add(light);
  }
  var ambientLight = new THREE.AmbientLight(0x555555);
  this.scene.add(ambientLight);

  this.addLabelsToScene();
}


addLabelsToScene() {

  var loader = new FontLoader();
  let url = './../assets/fonts/helvetiker_regular.typeface.json';

  loader.load(url, (font:any) =>{
      // Add the file / rank labels
      var opts = {
          font: font,
          size: 1,
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
      let textMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color(this.textColor)});

      for (var i = 0; i < 8; i++) {
          textGeom = new TextGeometry(this.alphaLabelText[i], opts);
          textGeom.computeBoundingBox();
          textGeom.computeVertexNormals();

          label = new THREE.Mesh(textGeom, textMaterial);
          label.position.x = 3 * i - 9 - opts.size;
          label.position.y = -0.9;
          label.position.z = -13;
          this.LABELS.push(label);
          this.scene.add(label);
          label = new THREE.Mesh(textGeom, textMaterial);
          label.position.x = 3 * i - 9 - opts.size;
          label.position.y = -0.9;
          label.position.z = 13;
          this.LABELS.push(label);
          this.scene.add(label);
          textGeom = new TextGeometry(this.numericLabelText[i], opts);
          label = new THREE.Mesh(textGeom,textMaterial);
          label.position.x = -13;
          label.position.y = -0.5;
          label.position.z = -9 - opts.size + 3 * (7 - i);
          this.LABELS.push(label);
          this.scene.add(label);
          label = new THREE.Mesh(textGeom,textMaterial);
          label.position.x = 13;
          label.position.y = -0.5;
          label.position.z = -9 - opts.size + 3 * (7 - i);
          this.LABELS.push(label);
          this.scene.add(label);
      }
      console.log(font)
  });
}

drawSparePieces() {
//   for (let sq in this.SPARE_POSITION) {
//     if (!this.SPARE_POSITION.hasOwnProperty(sq)) {
//         continue;
//     }
//     var piece = this.SPARE_POSITION[sq];
//     var mesh = this.buildPieceMesh(sq, piece);
//     this.PIECE_MESH_IDS[sq] = mesh.id;
//     this.scene.add(mesh);
// }
//  this.drawPositionInstant();
}


drawPositionInstant() {
  console.log(this.PIECE_MESH_IDS,this.CURRENT_POSITION)
  for (var sq in this.PIECE_MESH_IDS) {
      if (this.PIECE_MESH_IDS.hasOwnProperty(sq) !== true) {
          continue;
      }
      if (this.validSpareSquare(sq)) {
          continue; // leave spare pieces
      }
      this.scene.remove(this.scene.getObjectById(this.PIECE_MESH_IDS[sq]));
      delete this.PIECE_MESH_IDS[sq];
  }
  // add new meshes
  for (var square in this.CURRENT_POSITION) {
      if (this.CURRENT_POSITION.hasOwnProperty(square) !== true) {
          continue;
      }
      var mesh = this.buildPieceMesh(square, this.CURRENT_POSITION[square]);
      this.PIECE_MESH_IDS[square] = mesh.id;
      this.scene.add(mesh);
  }
}


deepCopy(thing:any) {
  return JSON.parse(JSON.stringify(thing));
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
  console.log(species,piece)
  geometry = this.GEOMETRIES[species];

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = coords.x;
  mesh.position.z = coords.z;
  if (color === 'w') {
      mesh.rotation.y = Math.PI;
  }
  let { scale, position } = this.SCALINGS[species];
  mesh.scale.x = scale.x;
  mesh.scale.y = scale.y;
  mesh.scale.z = scale.z;
  mesh.position.y = position.y;
  mesh.castShadow = true;
  return mesh;
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
 // returns the distance between two squares
 squareDistance(s1:any, s2:any) {
  s1 = s1.split('');
  var s1x = this.alphaLabelText.indexOf(s1[0]) + 1;
  var s1y = parseInt(s1[1], 10);

  s2 = s2.split('');
  var s2x = this.alphaLabelText.indexOf(s2[0]) + 1;
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
          var s = this.alphaLabelText[i] + (j + 1);

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


validOrdinarySquare(square:any) {
  if (typeof square !== 'string') return false;
  return (square.search(/^[a-h][1-8]$/) !== -1);
}

validSpareSquare(square:any) {
  if (typeof square !== 'string') return false;
  return (square.search(/^s[bw][1-6]$/) !== -1);
}

validSquare(square:any) {
  return this.validOrdinarySquare(square) || this.validSpareSquare(square);
}
validPieceCode(code:any) {
  if (typeof code !== 'string') {
      return false;
  }
  return (code.search(/^[bw][KQRNBP]$/) !== -1);
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
            var square = this.alphaLabelText[j] + currentRow;

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
                var square = this.alphaLabelText[colIndex] + currentRow;
                position[square] = this.fenToPieceCode(row[j]);
                colIndex++;
            }
        }

        currentRow--;
    }

    return position;
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
error(code:any, msg:any = null, obj:any = null) {
console.log(code,msg,obj);
}

setCurrentPosition(position:any) {
  var oldPos = this.deepCopy(this.CURRENT_POSITION);
  var newPos = this.deepCopy(position);
  var oldFen = this.objToFen(oldPos);
  var newFen = this.objToFen(newPos);
  if (oldFen === newFen) {
      return;
  }
  // if (this.cfg.hasOwnProperty('onChange') && typeof this.cfg.onChange === 'function') {
  //     this.cfg.onChange(oldPos, newPos);
  // }
  this.CURRENT_POSITION = position;
}

checkGeometriesLoaded() {
  return this.GEOMETRIES.P !== undefined
      && this.GEOMETRIES.N !== undefined
      && this.GEOMETRIES.B !== undefined
      && this.GEOMETRIES.R !== undefined
      && this.GEOMETRIES.Q !== undefined
      && this.GEOMETRIES.K !== undefined;
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


      // Verify that CURRENT_POSITION and PIECE_MESH_IDS are in sync
      checkBoard() {
        for (var sq in this.PIECE_MESH_IDS) {
            if (!this.PIECE_MESH_IDS.hasOwnProperty(sq) || this.validSpareSquare(sq)) {
                continue;
            }
            if (this.CURRENT_POSITION.hasOwnProperty(sq) === false) {
              this.error(3701, "Square "+sq+" in PIECE_MESH_IDS but not in CURRENT_POSITION");
            } else {
                if (!this.scene.getObjectById(this.PIECE_MESH_IDS[sq])) {
                  this.error(3702, "Mesh not present on square "+sq+", adding a replacement.");
                    var mesh = this.buildPieceMesh(sq, this.CURRENT_POSITION[sq]);
                    this.scene.add(mesh);
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


    animatePieceFadeOut(square : any, completeFn : any) {
      if (this.PIECE_MESH_IDS.hasOwnProperty(square)) {
          if (this.validOrdinarySquare(square) && this.PIECE_MESH_IDS.hasOwnProperty(square)) {
              var mesh = this.scene.getObjectById(this.PIECE_MESH_IDS[square]);
              this.startTween((t: any) =>{
                  mesh.opacity = 1 - t;
              }, () =>{
                this.scene.remove(mesh);
                  delete this.PIECE_MESH_IDS[square];
                  completeFn();
              },this.speed);  // ,this.cfg.trashSpeed
          }
      }
  }


  animateSquareToSquare(src: any, dest: any, completeFn: any) {
    var destSquareMesh : any, pieceMesh : any;
    if (this.PIECE_MESH_IDS.hasOwnProperty(src)) {
        pieceMesh = this.scene.getObjectById(this.PIECE_MESH_IDS[src]);
    }
    if (this.SQUARE_MESH_IDS.hasOwnProperty(dest)) {
        destSquareMesh = this.scene.getObjectById(this.SQUARE_MESH_IDS[dest]);
    }
    if (this.validSpareSquare(src)) {
        // this is an animation from a spare square to an ordinary square.
        pieceMesh = pieceMesh.clone();
        this.scene.add(pieceMesh);
    }
    if (destSquareMesh && pieceMesh) {
        var tx_src = pieceMesh.position.x, tz_src = pieceMesh.position.z, ty_src = pieceMesh.position.y;
        var tx_dest = destSquareMesh.position.x, tz_dest = destSquareMesh.position.z, ty_dest = destSquareMesh.position.y;
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
        },this.speed); //, this.cfg.moveSpeed
    }
}


  animatePieceFadeIn(square: any, piece: any, completeFn: any) {
    var mesh = this.buildPieceMesh(square, piece);
    mesh.opacity = 0;
    this.scene.add(mesh);
    this.startTween((t: any) => {
        mesh.opacity = t;
    }, () =>{
        this.PIECE_MESH_IDS[square] = mesh.id;
        completeFn();
    },this.speed); //, this.cfg.appearSpeed
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
          // if (this.cfg.hasOwnProperty('moveEnd') && typeof this.cfg.onMoveEnd === 'function') {
          //     this.cfg.onMoveEnd(this.deepCopy(oldPos),this.deepCopy(newPos));
          // }
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
                      this.animatePieceFadeIn(a[j].square, a[j].piece, onFinish);

      //   for (var sp in this.SPARE_POSITION) {
      //     if (!this.SPARE_POSITION.hasOwnProperty(sp)) {
      //         continue;
      //     }
      //     if (this.SPARE_POSITION[sp] === a[j].piece) {
      //       this.animateSquareToSquare(sp, a[j].square, onFinish);
      //     }
      // }
          // if (this.cfg.sparePieces === true) {
          //     for (var sp in this.SPARE_POSITION) {
          //         if (!this.SPARE_POSITION.hasOwnProperty(sp)) {
          //             continue;
          //         }
          //         if (this.SPARE_POSITION[sp] === a[j].piece) {
          //           this.animateSquareToSquare(sp, a[j].square, onFinish);
          //         }
          //     }
          // } else {
          //     this.animatePieceFadeIn(a[j].square, a[j].piece, onFinish);
          // }
      }
  }
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


setWidget(){
  this.widget.position = (position:any, useAnimation:any) =>{
    // no arguments, return the current position

    // if (arguments.length === 0) {
    //     return this.deepCopy(this.CURRENT_POSITION);
    // }

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
    return;
  };
  this.widget.start = (useAnimation:any = false)=> {
    this.widget.position('start', useAnimation);
  };
  this.widget.clear = (useAnimation:any)=> {
    this.widget.position({}, useAnimation);
  };
}


animateFrames() {
  window.requestAnimationFrame(() => this.animateFrames());
  this.renderer.render(this.scene,this.camera);
  this.controls.update();
  this.updateAllTweens();
  var x = this.camera.position.x, y = this.camera.position.y, z = this.camera.position.z;
  for (var i in this.LABELS) {
      if (!this.LABELS.hasOwnProperty(i)) {
          continue;
      }
      this.LABELS[i].lookAt(new THREE.Vector3(100 * x, 100 * y, 100 * z));
  }
 }
  @HostListener('window:resize', ['$event']) onResize(event : any) {
    this.camera.aspect = this.container.nativeElement.offsetWidth / this.container.nativeElement.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.nativeElement.offsetWidth, this.container.nativeElement.offsetHeight);
    this.renderer.render(this.scene, this.camera);
  }

}
