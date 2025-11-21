require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Definido' : 'Não definido');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, '../prisma/migrations/20250130130000_remove_setor_from_audits/migration.sql');
    let sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Remover comentários de linha única
    sql = sql.replace(/--.*$/gm, '');
    
    // Dividir por blocos DO $$ ... END $$ primeiro
    const blocks = [];
    let currentBlock = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = sql.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.includes('DO $$')) {
        inDoBlock = true;
        doBlockDepth = (line.match(/\$\$/g) || []).length;
        currentBlock = line;
        continue;
      }
      
      if (inDoBlock) {
        currentBlock += '\n' + line;
        if (line.includes('END $$')) {
          blocks.push(currentBlock + ';');
          currentBlock = '';
          inDoBlock = false;
          continue;
        }
      } else {
        // Comandos normais
        if (line.endsWith(';')) {
          blocks.push(line);
        } else {
          currentBlock += (currentBlock ? '\n' : '') + line;
          if (line.endsWith(';')) {
            blocks.push(currentBlock);
            currentBlock = '';
          }
        }
      }
    }
    
    if (currentBlock) {
      blocks.push(currentBlock + ';');
    }
    
    // Filtrar blocos vazios
    const commands = blocks
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`Aplicando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      try {
        console.log(`Executando comando ${i + 1}/${commands.length}...`);
        await prisma.$executeRawUnsafe(command);
        console.log(`✓ Comando ${i + 1} executado com sucesso`);
      } catch (error) {
        // Ignorar erros de "already exists", "does not exist" ou "duplicate_object"
        const errorMsg = error.message || '';
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('does not exist') ||
            errorMsg.includes('duplicate_object') ||
            errorMsg.includes('invalid input value for enum') && errorMsg.includes('already in use')) {
          console.log(`⚠ Comando ${i + 1} ignorado (já existe ou não é aplicável): ${errorMsg.split('\n')[0]}`);
        } else {
          console.error(`✗ Erro no comando ${i + 1}:`, errorMsg);
          // Não lançar erro se for apenas sobre enum já ter o valor
          if (!errorMsg.includes('invalid input value for enum')) {
            throw error;
          } else {
            console.log(`⚠ Comando ${i + 1} ignorado (valor do enum já existe): ${errorMsg.split('\n')[0]}`);
          }
        }
      }
    }
    
    console.log('✓ Migração aplicada com sucesso!');
  } catch (error) {
    console.error('✗ Erro ao aplicar migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

