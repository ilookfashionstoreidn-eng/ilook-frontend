const fs = require('fs');
const jsPath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Cutting/SpkCutting/SpkCutting.js';
let content = fs.readFileSync(jsPath, 'utf-8');

// 1. Fix the Create Form bottom
content = content.replace(
  /(\}\)\})\n                <button type="button" className="spk-cutting-btn spk-cutting-btn-secondary"/,
  "$1\n                    </div>\n                  </div>\n                </section>\n                </div>\n              </div>\n\n              <div className=\"spk-cutting-form-actions spk-cutting-create-actions\">\n                <button type=\"button\" className=\"spk-cutting-btn spk-cutting-btn-secondary\""
);

// 2. Fix the Edit Form errant div
content = content.replace(
  /onChange: \(value\) => handleEditAksesorisChange\(bagianIndex, bahanIndex, value\),\n\s*\}\)\}\n\s*<\/div>\n\s*<input type="text" value="Aksesoris"/,
  "onChange: (value) => handleEditAksesorisChange(bagianIndex, bahanIndex, value),\n                          })}\n                          <input type=\"text\" value=\"Aksesoris\""
);

// 3. Fix the Edit form missing closing div for the container
content = content.replace(
  /\s*\}\)\}\n\n\s*<button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick=\{addEditBagian\}>/,
  "\n                </div>\n              ))}\n              </div>\n\n              <button type=\"button\" className=\"spk-cutting-btn spk-cutting-btn-success\" onClick={addEditBagian}>"
);

fs.writeFileSync(jsPath, content);
console.log("Fixed JSX perfectly!");
