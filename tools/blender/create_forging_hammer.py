import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT / "assets" / "design-references" / "forge" / "forging-hammer-2_5d-reference.png"
OUTPUT_DIR = ROOT / "assets" / "models" / "forge"
APP_IMAGE_DIR = ROOT / "assets" / "images" / "forge"
BLEND_PATH = OUTPUT_DIR / "forging-hammer-2_5d.blend"
GLB_PATH = OUTPUT_DIR / "forging-hammer-2_5d.glb"
PREVIEW_PATH = APP_IMAGE_DIR / "forging-hammer-2_5d.png"


def material(name, color, metallic=0.0, roughness=0.5, emission=None):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 3.0
    return value


def bevelled_cube(name, location, scale, mat, bevel=0.08, parent=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Soft bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    modifier.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def cylinder(name, radius, depth, location, mat, vertices=16, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent
    bevel = obj.modifiers.new("Edge bevel", "BEVEL")
    bevel.width = 0.045
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
APP_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

steel = material("Forged Steel", (0.105, 0.115, 0.125), metallic=0.88, roughness=0.28)
steel_edge = material("Steel Edge", (0.25, 0.27, 0.29), metallic=0.92, roughness=0.2)
brass = material("Aged Brass", (0.42, 0.24, 0.075), metallic=0.8, roughness=0.31)
wood = material("Dark Walnut", (0.16, 0.065, 0.025), metallic=0.0, roughness=0.58)
leather = material("Leather Grip", (0.07, 0.028, 0.015), metallic=0.0, roughness=0.72)
ember = material(
    "Ember Core",
    (0.55, 0.08, 0.01),
    metallic=0.15,
    roughness=0.28,
    emission=(1.0, 0.16, 0.015),
)

root = bpy.data.objects.new("Hammer_Root_Strike_Pivot", None)
root.empty_display_type = "ARROWS"
root.empty_display_size = 0.38
root.location = (0.0, 0.0, -0.42)
root["animation_note"] = "Rotate this root around local Y for three hammer strikes."
root["suggested_strike_frames"] = "1, 8, 14, 21, 27, 34, 40"
bpy.context.collection.objects.link(root)

handle = cylinder("Handle_Walnut", 0.235, 2.65, (0.0, 0.0, 0.9), wood, 20, root)
handle.scale = (0.88, 1.0, 1.0)

for index, z in enumerate((-0.08, 0.18, 0.44, 0.70)):
    grip = cylinder(f"Grip_Leather_{index + 1:02d}", 0.252, 0.16, (0.0, 0.0, z), leather, 20, root)
    grip.rotation_euler[2] = math.radians(index * 9)

cylinder("Pommel_Brass", 0.32, 0.22, (0.0, 0.0, -0.36), brass, 16, root)
cylinder("Neck_Brass", 0.34, 0.26, (0.0, 0.0, 2.14), brass, 16, root)
cylinder("Neck_Ember", 0.27, 0.30, (0.0, 0.0, 2.14), ember, 16, root)

bevelled_cube("Head_Core", (0.0, 0.0, 2.62), (1.18, 0.47, 0.45), steel, 0.12, root)
bevelled_cube("Head_Left_Face", (-1.38, 0.0, 2.62), (0.32, 0.52, 0.55), steel_edge, 0.12, root)
bevelled_cube("Head_Right_Face", (1.38, 0.0, 2.62), (0.32, 0.52, 0.55), steel_edge, 0.12, root)
bevelled_cube("Head_Left_Ember", (-0.88, 0.0, 2.62), (0.07, 0.495, 0.39), ember, 0.025, root)
bevelled_cube("Head_Right_Ember", (0.88, 0.0, 2.62), (0.07, 0.495, 0.39), ember, 0.025, root)
bevelled_cube("Head_Left_Band", (-0.76, 0.0, 2.62), (0.09, 0.54, 0.51), brass, 0.035, root)
bevelled_cube("Head_Right_Band", (0.76, 0.0, 2.62), (0.09, 0.54, 0.51), brass, 0.035, root)

# Keep the generated concept image inside the .blend as a modeling reference.
if REFERENCE.exists():
    image = bpy.data.images.load(str(REFERENCE), check_existing=True)
    reference = bpy.data.objects.new("REFERENCE_Hammer_Concept", None)
    reference.empty_display_type = "IMAGE"
    reference.data = image
    reference.empty_display_size = 4.2
    reference.color[3] = 0.38
    reference.location = (0.0, 0.85, 1.2)
    reference.rotation_euler = (math.radians(90), 0.0, 0.0)
    reference.hide_render = True
    bpy.context.collection.objects.link(reference)
    reference.hide_set(True)

ground = bevelled_cube("Preview_Ground", (0.0, 0.0, -0.64), (3.2, 2.4, 0.08), material("Ground", (0.035, 0.045, 0.06), roughness=0.7), 0.06)
ground.hide_viewport = True
ground.hide_render = True

bpy.ops.object.light_add(type="AREA", location=(-3.8, -4.2, 6.0))
key = bpy.context.object
key.name = "Key_Light"
key.data.energy = 900
key.data.shape = "DISK"
key.data.size = 4.0
look_at(key, (0.0, 0.0, 1.2))

bpy.ops.object.light_add(type="AREA", location=(4.0, 1.5, 3.2))
fill = bpy.context.object
fill.name = "Fill_Light"
fill.data.energy = 550
fill.data.color = (0.35, 0.55, 1.0)
fill.data.size = 3.0
look_at(fill, (0.0, 0.0, 1.3))

bpy.ops.object.camera_add(location=(0.0, -10.0, 1.2))
camera = bpy.context.object
camera.name = "Camera_2_5D"
camera.data.type = "ORTHO"
camera.data.ortho_scale = 5.5
look_at(camera, (0.0, 0.0, 1.2))
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = True
scene.world.color = (0.025, 0.03, 0.04)
scene.frame_start = 1
scene.frame_end = 40

# A non-destructive three-hit preview animation on the strike pivot.
for frame, angle in ((1, -28), (8, 22), (14, -28), (21, 22), (27, -28), (34, 22), (40, -28)):
    root.rotation_euler = (0.0, math.radians(angle), 0.0)
    root.keyframe_insert(data_path="rotation_euler", frame=frame)
root.rotation_euler = (0.0, math.radians(-28), 0.0)
scene.frame_set(1)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

for obj in bpy.context.selected_objects:
    obj.select_set(False)
root.select_set(True)
for child in root.children_recursive:
    child.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_animations=True,
)
# Render the visible face straight-on at a neutral pivot angle. The app rotates
# this sprite into an oblique raised pose and a head-first impact pose.
strike_action = root.animation_data.action if root.animation_data else None
if root.animation_data:
    root.animation_data.action = None
root.rotation_euler = (0.0, 0.0, 0.0)
bpy.context.view_layer.update()
bpy.ops.render.render(write_still=True)
if root.animation_data:
    root.animation_data.action = strike_action
print(f"BLEND={BLEND_PATH}")
print(f"GLB={GLB_PATH}")
print(f"PREVIEW={PREVIEW_PATH}")
