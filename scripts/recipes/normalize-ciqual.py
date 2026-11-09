#!/usr/bin/env python3
"""Parse the Ciqual XLS locally (requires xlrd); preserve unknowns and limits.
Energy absent from the table is estimated from available energy components,
with the incomplete calculation explicitly recorded for each reference.
"""
import argparse, hashlib, json, math
from pathlib import Path
import xlrd
COLUMNS={'energyKcal':10,'proteinG':14,'carbsG':16,'fatG':17,'sugarG':18,'fiberG':26,'saturatedFatG':31,'saltG':49,'calciumMg':50,'ironMg':53,'magnesiumMg':55,'potassiumMg':58,'retinolUg':62,'vitaminDUg':64,'vitaminEMg':65,'vitaminCMg':68,'folateUg':74,'vitaminB12Ug':75}
def parse(value):
    value=str(value).strip().replace(',','.')
    upper=value.startswith('<')
    try: number=float(value.lstrip('<').strip())
    except ValueError:return None,False
    return (number,upper) if math.isfinite(number) and number>=0 else (None,False)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('xls');parser.add_argument('output');args=parser.parse_args()
    sheet=xlrd.open_workbook(args.xls).sheet_by_name('compo');foods=[]
    for row in range(1,sheet.nrows):
        values={};bounds=[];notes=[]
        for key,column in COLUMNS.items():
            values[key],upper=parse(sheet.cell_value(row,column))
            if upper:bounds.append(key)
        # This is a declared approximation, never a replacement for a measured value.
        if values['energyKcal'] is None and all(values[k] is not None for k in ['proteinG','carbsG','fatG','fiberG']):
            parts=[(14,4),(16,4),(17,9),(26,2),(27,2.4),(29,7),(30,3)]
            total=0;omitted=[]
            for col,factor in parts:
                val,upper=parse(sheet.cell_value(row,col))
                if val is None:omitted.append(str(sheet.cell_value(0,col)))
                else:total+=val*factor
                if upper and 'energyKcal' not in bounds:bounds.append('energyKcal')
            # Vinegar energy cannot reasonably be approximated without its acids.
            if 'vinaigre' not in str(sheet.cell_value(row,7)).lower():
                values['energyKcal']=round(total,6)
                notes.append('Énergie absente de Ciqual : approximation 4 kcal/g protéines et glucides, 9 lipides, 2 fibres, 2,4 polyols, 7 alcool et 3 acides organiques, selon les composants quantifiés.'+(' Composants non quantifiés exclus du calcul : '+', '.join(omitted)+'.' if omitted else ''))
        foods.append(dict(code=str(int(sheet.cell_value(row,6))),name=sheet.cell_value(row,7),category=sheet.cell_value(row,3),values=values,upper_bounds=bounds,assumptions=notes))
    Path(args.output).write_text(json.dumps(dict(source='Anses Ciqual 2020',original_url='https://ciqual.anses.fr/cms/sites/default/files/inline-files/Table%20Ciqual%202020_FR_2020%2007%2007.xls',mirror_sha256=hashlib.sha256(Path(args.xls).read_bytes()).hexdigest(),foods=foods),ensure_ascii=False,indent=2))
if __name__=='__main__':main()
