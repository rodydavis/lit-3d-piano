import { html, css, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as Tone from "tone";

@customElement("piano-component")
export class PianoComponent extends LitElement {
  @query("canvas") canvas!: HTMLCanvasElement;
  @state() octave = 2;
  @state() note = "";
  synth = new Tone.PolySynth().toDestination();
  raycaster = new THREE.Raycaster();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.001,
    10
  );
  renderer?: THREE.WebGLRenderer;
  controls?: OrbitControls;

  public get context(): CanvasRenderingContext2D {
    const ctx = this.canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    return ctx;
  }

  static styles = css`
    main {
      width: 100%;
      height: 100vh;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    canvas {
      width: 100%;
      height: 100%;
      z-index: 0;
    }
    .controls {
      z-index: 1;
      position: fixed;
      color: white;
      font-size: 18px;
      right: 10px;
      top: 10px;
    }
    .note {
      z-index: 1;
      position: fixed;
      color: white;
      font-size: 18px;
      left: 10px;
      top: 10px;
    }
  `;

  render() {
    const tapNote = (x: number, y: number) => {
      const dx = (x / window.innerWidth) * 2 - 1;
      const dy = -(y / window.innerHeight) * 2 + 1;
      this.findNote(new THREE.Vector2(dx, dy));
    };
    return html`<main>
      <canvas
        @touchstart=${(e: any) => {
          e.preventDefault();
          for (const touch of e.touches) {
            tapNote(touch.clientX, touch.clientY);
          }
        }}
        @touchmove=${(e: any) => (e.preventDefault())}
        @touchcancel=${() => (this.onKeyUp())}
        @touchend=${() => (this.onKeyUp())}
        @mousedown=${(e: any) => {
          e.preventDefault();
          tapNote(e.clientX, e.clientY);
        }}
        @mouseup=${() => (this.onKeyUp())}
      ></canvas>
      <div class="controls">
        OCTAVE: ${octaves[this.octave]}
        <button
          ?disabled=${this.octave === 0}
          @click=${() => (this.octave -= 1)}
        >
          -
        </button>
        <button
          ?disabled=${this.octave === octaves.length - 1}
          @click=${() => (this.octave += 1)}
        >
          +
        </button>
      </div>
      <div class="note">NOTE: ${this.note}</div>
    </main>`;
  }

  onKeyUp = () => {};

  findNote(mouse: THREE.Vector2) {
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    const obj = intersects.length > 0 ? intersects[0] : null;
    if (obj?.object?.userData) {
      if (obj.object instanceof THREE.Mesh) {
        obj.object.material.color.set("gray");
        const { note } = obj.object.userData;
        this.playNote(note, (color) => {
          // @ts-ignore
          obj?.object?.material.color.set(color);
        });
      }
    }
  }

  playNote(note: string, update: (color: string) => void) {
    this.note = note;
    const color = note.includes("#") ? "black" : "white";
    this.synth.triggerAttackRelease(note, "8n");
    this.onKeyUp = () => {
      update(color);
    };
  }

  findNode(
    note: string,
    nodes: THREE.Object3D[]
  ): THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null {
    for (const node of nodes) {
      if (node instanceof THREE.Mesh) {
        return node;
      }
      if (node instanceof THREE.Group) {
        const child = this.findNode(note, node.children);
        if (child) return child;
      }
    }
    return null;
  }

  noteMap: any = {
    C: "C#",
    D: "D#",
    F: "F#",
    G: "G#",
    A: "A#",
  };

  buildPiano() {
    const group = new THREE.Group();
    for (let i = 0; i < octaves.length; i++) {
      const node = this.buildOctave(i, octaves[i]);
      group.add(node);
    }
    group.position.x -= 2.5;
    this.scene.add(group);
  }

  buildOctave(offset: number, octave: number) {
    const group = new THREE.Group();
    for (let i = 0; i < notes.length; i++) {
      const key = `${notes[i]}${octave}` as any;
      const note = this.buildPianoKey(i * 0.2, key);
      if (Object.keys(this.noteMap).includes(notes[i])) {
        const note = `${this.noteMap[notes[i]]}${octave}`;
        const accidental = this.buildAccidental(i * 0.2, note as any);
        accidental.castShadow = true;
        accidental.receiveShadow = false;
        group.add(accidental);
      }
      note.castShadow = true;
      note.receiveShadow = false;
      group.add(note);
    }
    group.position.x += 1.4 * offset;
    return group;
  }

  keyOptions = {
    depth: 0.1,
    width: 0.2,
    height: 0.4,
  };

  buildPianoKey(offset: number, note: NoteName) {
    const geometry = new THREE.BoxGeometry(
      this.keyOptions.width * 0.8,
      this.keyOptions.height,
      this.keyOptions.depth
    );
    const material = new THREE.MeshStandardMaterial({ color: "white" });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x += offset;
    mesh.userData["note"] = note;
    return mesh;
  }

  buildAccidental(offset: number, note: NoteName) {
    const geometry = new THREE.BoxGeometry(
      this.keyOptions.width * 0.8,
      this.keyOptions.height * 0.6,
      this.keyOptions.depth
    );
    const material = new THREE.MeshStandardMaterial({ color: "black" });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x += offset + 0.1;
    mesh.position.y += 0.08;
    mesh.position.z += 0.1;
    mesh.userData["note"] = note;
    return mesh;
  }

  paint() {
    this.renderer!.render(this.scene, this.camera);
    this.controls!.update();
  }

  firstUpdated() {
    this.camera.position.z = 1;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      alpha: true,
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.screenSpacePanning = true;
    this.controls.enableKeys = true;
    this.renderer!.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(() => this.paint());
    this.renderer.setClearColor("red", 1);

    const bgLight = new THREE.AmbientLight(0x404040);
    this.scene.add(bgLight);

    const light = new THREE.DirectionalLight(0x404040, 100);
    light.position.set(10, 4, 0.7);
    light.castShadow = true;
    this.scene.add(light);

    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;

    this.buildPiano();

    document.addEventListener(
      "keydown",
      (e: any) => {
        const key = e.key;
        if (key === "z" && this.octave != 0) this.octave -= 1;
        if (key === "x" && this.octave != octaves.length - 1) this.octave += 1;
        const play = (note: string) => {
          this.playNote(`${note}${octaves[this.octave]}`, () => {});
        };
        if (key === "a") play("C");
        if (key === "w") play("C#");
        if (key === "s") play("D");
        if (key === "E") play("D#");
        if (key === "d") play("E");
        if (key === "f") play("F");
        if (key === "t") play("F#");
        if (key === "g") play("G");
        if (key === "y") play("G#");
        if (key === "h") play("A");
        if (key === "u") play("A#");
        if (key === "j") play("B");
        if (key === "k") play("C");
        if (key === "o") play("C#");
        if (key === "l") play("D");
        if (key === "p") play("D#");
      },
      false
    );

    window.addEventListener(
      "resize",
      () => {
        this.renderer!.setSize(window.innerWidth, window.innerHeight);
      },
      false
    );
  }
}
const notes = ["C", "D", "E", "F", "G", "A", "B"] as const;
type Note = typeof notes[number];
const octaves = [2, 3, 4, 5] as const;
type Octave = typeof octaves[number];
type NoteName = `${Note}${Octave}`;
