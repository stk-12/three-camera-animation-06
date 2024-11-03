import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { gsap } from "gsap";
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);


class Main {
  constructor() {
    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    this.DOM = {};
    this.DOM.control = document.querySelector('.js-controls');
    this.DOM.controlBtns = document.querySelectorAll('.js-btn-control');

    this.canvas = document.querySelector("#canvas");

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.viewport.width, this.viewport.height);

    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('libs/draco/');
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(this.dracoLoader);

    this.animations = null;
    this.mixer = null;
    this.currentAction = null; // 再生中のアクション

    this.startTime = 0.1;

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = null;
    this.cameras = [];

    this.controls = null;


    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedIsland = 1; // 島を識別するインデックス

    this.canvas.addEventListener('click', (event) => this._onMouseClick(event), false);



    this._init();

    this._addEvent();
  }

  _setCamera() {
    //ウインドウとWebGL座標を一致させる
    const fov = 45;
    const fovRadian = (fov / 2) * (Math.PI / 180); //視野角をラジアンに変換
    const distance = (this.viewport.height / 2) / Math.tan(fovRadian); //ウインドウぴったりのカメラ距離
    this.camera = new THREE.PerspectiveCamera(fov, this.viewport.width / this.viewport.height, 1, distance * 2);
    this.camera.position.z = distance;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(this.camera);
  }

  _setLight() {
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(1, 1, 1);
    this.scene.add(light);

    const ambLight = new THREE.AmbientLight(0xFFFFFF, 0.8);
    this.scene.add(ambLight);
  }

  _addModel() {
    this.loader.load('model/island3.glb', (gltf) => {
      const model = gltf.scene;
      this.animations = gltf.animations;

      console.log('model', model);

      // Animation Mixerインスタンスを生成
      this.mixer = new THREE.AnimationMixer(model);

      // GLTFファイル内のすべてのカメラを配列に追加
      this.cameras = gltf.cameras;
      this.camera = this.cameras[0];


      this.scene.add(model);

      // 島の位置を保存するためのオブジェクトを初期化
      this.islandPositions = {};

      this._onResize();

      this._update();


    });
  }

  _onMouseClick(event) {
    // マウスのスクリーン位置を正規化
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // レイキャスターを更新
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // シーン内のオブジェクトとの交差を取得
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      // 最初の交差地点を取得し、現在の島の位置として保存
      const intersection = intersects[0].point;
      this.islandPositions[`island${this.selectedIsland}`] = intersection.clone();

      console.log(`island${this.selectedIsland}の位置:`, intersection);
      
      // 次の島用にインデックスを更新
      this.selectedIsland = (this.selectedIsland % 3) + 1;
    }
  }

  _playAnimation(index) {
    if (!this.animations || !this.animations[index]) return;

    // 既存のアクションを停止
    // this.mixer.stopAllAction();
    if (this.currentAction) {
      this.currentAction.stop();
    }

    this.DOM.control.classList.add('is-forward');
    this.DOM.control.classList.remove('is-back');
    this.DOM.control.classList.remove('is-default');

    // 指定のアニメーションを取得して再生
    const animation = this.animations[index];
    this.currentAction = this.mixer.clipAction(animation);
    this.currentAction.setLoop(THREE.LoopOnce);
    this.currentAction.clampWhenFinished = true;
    this.currentAction.timeScale = 1.5; // 通常再生
    this.currentAction.play();
  }

  _reverseAnimation() {
    if (this.currentAction) {
      this.currentAction.paused = false; // 再生中にする
      this.currentAction.timeScale = -1.5; // 逆再生
      this.currentAction.play();

      this.DOM.control.classList.add('is-back');
      this.DOM.control.classList.remove('is-forward');

      this.currentAction.getMixer().addEventListener('finished', () => {
        this.DOM.control.classList.add('is-default');
        this.DOM.control.classList.remove('is-back');
      })
    }
  }

  _switchCamera(index) {
    if (this.cameras[index]) {
      this.camera = this.cameras[index]; // 指定のカメラに切り替え

      // カメラのアスペクト比を現在のウィンドウサイズに合わせる
      this.camera.aspect = this.viewport.width / this.viewport.height;
      this.camera.updateProjectionMatrix(); // プロジェクションマトリックスを更新

      this._playAnimation(index);
    }
  }


  _loadAnimation() {  
    // ロード時のアニメーション
    const tlLoadAnimation = gsap.timeline({});
    tlLoadAnimation.to('.js-ttl', {
      opacity: 1,
      delay: 0.6,
    })
    .to('.js-ttl-txts', {
      y: 0,
      duration: 0.6,
      ease: 'circ.out',
      stagger: 0.03,
    })
    .to('.js-ttl-txts', {
      y: '-100%',
      duration: 0.6,
      ease: 'circ.out',
      stagger: 0.03,
      onComplete: () => {
        this.DOM.control.classList.add('is-active');
      }
    }, '+=2.0')

  }


  _init() {
    // this._setCamera();
    // this._setControlls();
    this._setLight();
    // this._addMesh();
    this._addModel();
    this._loadAnimation();
  }

  _update() {

    // this.lenis.raf(time);

    this.mixer && this.mixer.update(this.clock.getDelta());

    //レンダリング
    this.renderer.render(this.scene, this.camera);
    // this.controls.update();
    requestAnimationFrame(this._update.bind(this));

  }

  _onResize() {
    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    // レンダラーのサイズを修正
    this.renderer.setSize(this.viewport.width, this.viewport.height);
    // カメラのアスペクト比を修正
    this.camera.aspect = this.viewport.width / this.viewport.height;
    this.camera.updateProjectionMatrix();
  }

  _handleBtnClick(event) {
    const animationType = event.target.dataset.animation;

    if(animationType === 'back') {
      this._reverseAnimation();
    } else {
      const animationIndex = parseInt(animationType, 10) - 1;
      this._switchCamera(animationIndex);
    }
  }


  _addEvent() {
    window.addEventListener("resize", this._onResize.bind(this));

    this.DOM.controlBtns.forEach((btn) => {
      btn.addEventListener('click', this._handleBtnClick.bind(this));
    });
  }


}

new Main();



