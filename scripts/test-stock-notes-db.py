#!/usr/bin/env python3
"""Lot notes on disposable local PostgreSQL; never connects to production."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('stock_tests',Path(__file__).with_name('test-v10-stock-db.py'))
stock=importlib.util.module_from_spec(spec);spec.loader.exec_module(stock)
run,lit=stock.run,stock.literal
migration=stock.ROOT/'supabase/migrations/20261109171003_stock_lot_notes.sql'
run('CREATE DATABASE '+stock.DATABASE+';',database='postgres')
try:
 run(file=stock.ROOT/'supabase/tests/v10-personalization-schema.sql')
 run(file=stock.ROOT/'supabase/migrations/20261008151704_v10_reliability_commands.sql')
 run(file=migration);run(file=migration)
 note='Plutôt plein ; ouvert depuis environ une semaine au réfrigérateur. Conservation à vérifier.'
 run('UPDATE inventory SET notes='+lit(note)+' WHERE id='+lit(stock.LOT)+';',owner=stock.A)
 assert run('SELECT notes FROM inventory WHERE id='+lit(stock.LOT)+';',owner=stock.A)==note
 assert run('SELECT count(*) FROM inventory WHERE id='+lit(stock.LOT)+';',owner=stock.B)=='0'
 run('UPDATE inventory SET notes=\'autre\' WHERE id='+lit(stock.LOT)+';',owner=stock.B)
 assert run('SELECT notes FROM inventory WHERE id='+lit(stock.LOT)+';',owner=stock.A)==note
 run('UPDATE inventory SET notes=repeat(\'x\',4001) WHERE id='+lit(stock.LOT)+';',owner=stock.A,error='inventory_notes_length')
 assert run('SELECT count(*) FROM inventory WHERE notes IS NULL;')!='0'
 run('UPDATE inventory SET quantity=2 WHERE id='+lit(stock.LOT)+';',owner=stock.A)
 assert run('SELECT notes FROM inventory WHERE id='+lit(stock.LOT)+';',owner=stock.A)==note
 run('SELECT notes FROM inventory;',role='anon',error='permission denied')
 print('PASS migration replay, existing nulls, owner access, foreign isolation, note length and quantity correction preservation')
finally:
 run('DROP DATABASE '+stock.DATABASE+' WITH (FORCE);',database='postgres')
