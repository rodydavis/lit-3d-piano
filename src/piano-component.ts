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
  mouse = new THREE.Vector2();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.001,
    10
  );

  public get context(): CanvasRenderingContext2D {
    const ctx = this.canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    return ctx;
  }

  static styles = css`
    main {
      width: 100%;
      height: 100vh;
    }
    canvas {
      width: 100%;
      height: 100%;
    }
  `;

  render() {
    return html`<main>
      <canvas
        @mousemove=${(e: any) => {
          this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
          this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        }}
        @click=${() => {
          this.findNote();
        }}
      ></canvas>
    </main>`;
  }

  firstUpdated() {
    // Setup the camera
    this.camera.position.z = 1;

    // Paint the 3D scene on the canvas
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      alpha: true,
    });
    const controls = new OrbitControls(this.camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.enableKeys = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop((time) =>
      this.updateLoop(time, renderer, controls)
    );
    renderer.setClearColor("red", 1);

    // Add Lights
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.AmbientLight(color, intensity);
    this.scene.add(light);

    this.buildPiano();
  }

  findNote() {
    // update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    const obj = intersects.length > 0 ? intersects[0] : null;
    if (obj?.object?.userData) {
      const { note } = obj.object.userData;
      console.log("note", note);
      this.playNote(note);
    }
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

  updateLoop(
    _: number,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls
  ) {
    // this.scene.children.splice(0, this.scene.children.length);
    renderer.render(this.scene, this.camera);
    controls.update();
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
