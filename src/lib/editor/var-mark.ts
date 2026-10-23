import { Mark } from "@tiptap/core";

/** Marca amarilla (<mark class="var">) para datos de una plantilla que aún faltan por llenar. */
export const VarMark = Mark.create({
  name: "templateVar",
  inclusive: false,
  parseHTML() {
    return [{ tag: "mark.var" }];
  },
  renderHTML() {
    return ["mark", { class: "var" }, 0];
  },
});
