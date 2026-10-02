# Product source inspection

All unique images exposed by each product gallery were inspected via the local Next image proxy. Image indices are 1-based gallery order; full URLs are in `sources.json`.

| Product | Gallery images | Clean isolated alternative |
| --- | ---: | --- |
| Triple Body Butter Lavender | 2 | None. Both show hands holding an open tin. |
| Triple Body Butter Sandalwood | 1 | None. The sole image has hands, an open tin, and marketing captions. |
| Mud Face Wash | 1 | None. The sole image shows a cylindrical glass jar with metal lid; powder, leaves, and turmeric overlap the lower edge. |
| Body Ubtan Tea Tree (`-1`) | 8 | None as a complete image. Image 6 contains a clear jar region on a pedestal. |
| Facial Ubtan Orange Almond (`-1`) | 9 | None as a complete image. Image 6 contains a clear jar region on a pedestal. |

## Best crop candidates for duplicate ubtans

Body Ubtan image 6: approximate normalized jar rectangle `x=.282, y=.282, width=.403, height=.423`.

Facial Ubtan image 6: approximate normalized jar rectangle `x=.285, y=.307, width=.402, height=.414`.

These image-6 candidates preserve the full jar body and lid without ingredient overlap. Crop selection must exclude the pedestal and marketing copy; a thin annotation line still touches the left lid edge. They are not suitable as uncropped inputs to automatic whole-photo silhouette extrusion.

The duplicate products' image 1 has foreground ingredients overlapping the jar base. Images 2 have large captions and ingredients beside the jar; remaining images are marketing/usage/ingredient compositions rather than isolated closed containers.
