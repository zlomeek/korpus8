const fs = require('fs');
let content = fs.readFileSync('src/components/CabinetForm.tsx', 'utf8');

if (!content.includes('hoodHeight?: number;')) {
    content = content.replace('ovenBaseHeight?: number;', 'ovenBaseHeight?: number;\n        hoodHeight?: number;');
    content = content.replace("const ovenBaseHeight = cabinet.ovenBaseHeight || (cabinet.id === 'dolna-piekarnik' ? 720 : undefined);", "const ovenBaseHeight = cabinet.ovenBaseHeight || (cabinet.id === 'dolna-piekarnik' ? 720 : undefined);\n        const hoodHeight = cabinet.hoodHeight || (cabinet.id === 'gorna-okapowa' ? 150 : undefined);");
    content = content.replace('ovenBaseHeight,', 'ovenBaseHeight,\n            hoodHeight,');
}

content = content.replace(/generateFixedElements\(([\s\S]*?)\)/g, (match, p1) => {
    if (p1.includes('updated.splitCargoFront') || p1.includes('splitCargoFront')) {
        if (!p1.includes('hoodHeight')) {
             if (p1.includes('updated.splitCargoFront')) {
                 return 'generateFixedElements(' + p1 + ', updated.hoodHeight)';
             } else if (p1.includes('checked')) {
                 return 'generateFixedElements(' + p1 + ', updated.hoodHeight)';
             } else {
                 return 'generateFixedElements(' + p1 + ', hoodHeight)'; 
             }
        }
    }
    return match;
});

content = content.replace(/hasFronts, 'Płyta laminowana 18mm', false\)/g, "hasFronts, 'Płyta laminowana 18mm', false, hoodHeight)");

fs.writeFileSync('src/components/CabinetForm.tsx', content);
