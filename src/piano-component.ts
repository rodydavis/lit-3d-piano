import { html, css, LitElement } from "lit";
import { customElement, query } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as Tone from "tone";

@customElement("piano-component")
export class PianoComponent extends LitElement {
  @query("canvas") canvas!: HTMLCanvasElement;
  synth = new Tone.Synth().toDestination();
  notes = new Map<string, boolean>();
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
    }
  `;

  render() {
    const tapNote = (x, y) => {
      const dx = (x / window.innerWidth) * 2 - 1;
      const dy = -(y / window.innerHeight) * 2 + 1;
      this.findNote(new THREE.Vector2(dx, dy));
    };
    return html`<main>
      <canvas
        @touchstart=${(e: any) => {
          for (const touch of e.touches) {
            tapNote(touch.clientX, touch.clientY);
          }
        }}
        @touchend=${() => {
          this.onKeyUp();
        }}
        @mousedown=${(e: any) => {
          tapNote(e.clientX, e.clientY);
        }}
        @mouseup=${() => {
          this.onKeyUp();
        }}
      ></canvas>
    </main>`;
  }

  onKeyUp = () => {};

  firstUpdated() {
    // Setup the camera
    this.camera.position.z = 1;

    // Paint the 3D scene on the canvas
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      alpha: true,
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.screenSpacePanning = true;
    this.controls.enableKeys = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(() => this.paint());
    this.renderer.setClearColor("red", 1);

    // Add Lights
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.AmbientLight(color, intensity);
    this.scene.add(light);

    this.buildPiano();
  }

  findNote(mouse: THREE.Vector2) {
    // update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(mouse, this.camera);

    // calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    const obj = intersects.length > 0 ? intersects[0] : null;
    if (obj?.object?.userData) {
      if (obj.object instanceof THREE.Mesh) {
        obj.object.material.color.set("gray");
        const { note } = obj.object.userData;
        const color = note.includes("#") ? "black" : "white";
        this.playNote(note);
        this.onKeyUp = () => {
          // @ts-ignore
          obj?.object?.material.color.set(color);
        };
      }
    }
  }

  findNode(
    note: string,
    nodes: THREE.Object3D[]
  ): THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> | null {
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
        group.add(accidental);
      }
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
    const material = new THREE.MeshBasicMaterial({ color: "white" });
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
    const material = new THREE.MeshBasicMaterial({ color: "black" });
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

  playNote(note: NoteName) {
    if (this.notes.get(note)) return;
    this.notes.set(note, true);
    this.synth.triggerAttackRelease(note, "8n");
    this.notes.set(note, false);
  }
}
const notes = ["C", "D", "E", "F", "G", "A", "B"] as const;
type Note = typeof notes[number];
const octaves = [2, 3, 4, 5] as const;
type Octave = typeof octaves[number];
type NoteName = `${Note}${Octave}`;
