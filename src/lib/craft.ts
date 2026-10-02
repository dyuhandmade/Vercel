import type {Product} from './types';

export type ProcessStep={title:string;short:string;description:string;input:string;output:string;detail:string};
// These sequences demonstrate the PRD's process direction. Live products use their own craft_steps.
export const processStudies:Record<Exclude<Product['shape'],'general'>,ProcessStep[]>={
 jar:[
  {short:'Measure',title:'Measure the ingredients.',description:'Oils and plant butters are weighed separately before they are brought together.',input:'Oils & plant butters',output:'Measured ingredients',detail:'A balance, a bowl, and the beginning of a batch.'},
  {short:'Infuse',title:'Prepare the botanical oil.',description:'Botanicals meet the oil, which is then separated from the plant material.',input:'Botanicals & oil',output:'Prepared botanical oil',detail:'Follow the material as it moves from plant to oil.'},
  {short:'Blend',title:'Bring the base together.',description:'The prepared oil and softened base are stirred into a uniform blend.',input:'Prepared oil & base',output:'An even blend',detail:'Watch the spatula move through the mixture.'},
  {short:'Pour',title:'Fill each jar.',description:'The blend is portioned into open jars, ready for the next stage.',input:'Finished blend',output:'Filled jars',detail:'From the mixing vessel into the final container.'},
  {short:'Set & check',title:'Let the balm take shape.',description:'The filled balm sets before the finish and fill are checked.',input:'Freshly filled jars',output:'Set balm',detail:'The liquid blend becomes the finished form.'},
  {short:'Finish',title:'Close, label, and pack.',description:'The lid, label, and outer packaging complete the finished product.',input:'Set balm & packaging',output:'A finished jar',detail:'The final hands-on steps before the jar leaves the atelier.'},
 ],
 bottle:[
  {short:'Measure',title:'Measure the oils.',description:'The oils for the blend are weighed separately before combining.',input:'Individual oils',output:'Measured oils',detail:'Each material is prepared for the batch.'},
  {short:'Infuse',title:'Prepare the botanical oil.',description:'Botanicals meet the oil, which is then separated from the plant material.',input:'Botanicals & oil',output:'Prepared botanical oil',detail:'Follow the transformation from raw botanical to oil.'},
  {short:'Blend',title:'Mix the oil blend.',description:'The prepared oils are stirred together to create a uniform blend.',input:'Prepared oils',output:'Blended oil',detail:'Separate materials become one mixture.'},
  {short:'Fill',title:'Fill the bottles.',description:'The finished blend is transferred from the mixing vessel into bottles.',input:'Blended oil',output:'Filled bottles',detail:'Watch the oil move into its final container.'},
  {short:'Check',title:'Check the filled batch.',description:'The fill and finish of the bottles are checked before closure.',input:'Filled bottles',output:'Bottles ready to finish',detail:'Attention moves from the blend to each individual bottle.'},
  {short:'Finish',title:'Fit the cap and label.',description:'The closure, label, and packaging complete the bottle.',input:'Filled bottle & packaging',output:'A finished bottle',detail:'The final assembly, one piece at a time.'},
 ],
 soap:[
  {short:'Measure',title:'Weigh the materials.',description:'The base materials are measured separately before the batch begins.',input:'Base materials',output:'Measured ingredients',detail:'A balance and prepared vessels begin the process.'},
  {short:'Prepare',title:'Prepare the oil blend.',description:'The measured oils are brought together in the mixing vessel.',input:'Measured oils',output:'Prepared oil blend',detail:'Follow the ingredients into the batch.'},
  {short:'Mix',title:'Mix the soap batter.',description:'The batch is mixed to an even texture before it is shaped.',input:'Prepared ingredients',output:'Soap batter',detail:'Watch the mixture come together.'},
  {short:'Mould',title:'Pour into the mould.',description:'The batter is poured into a mould to form the soap loaf.',input:'Soap batter',output:'A filled mould',detail:'The mould gives the batch its first shape.'},
  {short:'Cut & cure',title:'Form the individual bars.',description:'The set loaf is cut into bars, which are left to cure before finishing.',input:'Set soap loaf',output:'Individual bars',detail:'From one batch to individual pieces.'},
  {short:'Wrap',title:'Wrap each finished bar.',description:'Each finished bar is wrapped and labelled for its final presentation.',input:'Finished bars & wrap',output:'A wrapped bar',detail:'Paper meets the finished shape.'},
 ],
};
