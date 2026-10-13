import ExcelJS from 'exceljs';
import {
  fmt,
  hoyColombia,
  formatearFechaHumana,
  itemsCrudosVenta,
  normalizarEstado,
  precioDeItem,
  costoDeItem,
  precioTotalVenta,
  costoTotalVenta,
  abonoClienteTotal,
  saldoCliente
} from './utils';

// Paleta corporativa elegante para Excel
const EXCEL_THEME = {
  headerFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 800
  },
  headerFont: {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  },
  subHeaderFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' } // Slate 700
  },
  bodyFont: {
    name: 'Calibri',
    size: 10,
    color: { argb: 'FF0F172A' }
  },
  boldBodyFont: {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: 'FF0F172A' }
  },
  thinBorder: {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  },
  zebraA: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' } // Slate 50
  },
  zebraB: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' } // White
  },
  moneyFormat: '"$"#,##0',
  numberFormat: '#,##0'
};

// Colores semánticos para badges de estado en celdas de Excel
const ESTADOS_EXCEL = {
  'Pedido': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, // Amber 100
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } } // Amber 800
  },
  'Comprado': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }, // Sky 100
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF075985' } } // Sky 800
  },
  'Bordando': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }, // Purple 100
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF6B21A8' } } // Purple 800
  },
  'Listo para entrega': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }, // Emerald 100
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF065F46' } } // Emerald 800
  },
  'Entregado': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }, // Blue 100
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } } // Blue 800
  },
  'Liquidado': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } }, // Teal 100
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF115E59' } } // Teal 800
  }
};

/**
 * Aplica estilos a la fila de cabecera
 */
function styleHeader(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = EXCEL_THEME.headerFill;
    cell.font = EXCEL_THEME.headerFont;
    cell.border = EXCEL_THEME.thinBorder;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
}

/**
 * Ajusta el ancho de las columnas automáticamente con padding cómodo
 */
function autoFitColumns(worksheet, minWidth = 12) {
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value != null ? String(cell.value) : '';
      if (val.length > maxLen) maxLen = val.length;
    });
    column.width = Math.max(maxLen + 4, minWidth);
  });
}

/**
 * Descarga en el navegador un workbook de ExcelJS
 */
async function descargarWorkbook(workbook, nombreArchivo) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * EXPORTAR LISTA DE COMPRA (SOLO PEDIDOS EN ESTADO 'PEDIDO')
 * Diseñado con tabla con autofiltro en columnas, colores y orden para taller de confección
 */
export async function exportarListaCompraExcel(ventas, filtroVendedor = 'Todos') {
  // 1. Filtrar ventas activas que no estén finalizadas
  let dataset = (ventas || []).filter(v => !v.finalizado);

  if (filtroVendedor !== 'Todos') {
    dataset = dataset.filter(v => v.vendedor === filtroVendedor);
  }

  // 2. Extraer ÚNICAMENTE las prendas en estado 'Pedido'
  const prendasPorComprar = [];
  let totalCostoCompra = 0;
  let totalVentaCompra = 0;

  dataset.forEach(v => {
    const items = itemsCrudosVenta(v);
    const cant = Number(v.cantidad) || 1;

    if (items && items.length > 0) {
      items.forEach((it, idx) => {
        const est = normalizarEstado(it.estado || v.estado);
        if (est === 'Pedido') {
          const precio = precioDeItem(it, v);
          const costo = costoDeItem(it, v);
          const abonoItem = Number(it.abono) || 0;
          const saldoItem = Math.max(precio - abonoItem, 0);

          totalCostoCompra += costo;
          totalVentaCompra += precio;

          prendasPorComprar.push({
            pedidoId: v.id,
            itemIdx: idx + 1,
            cliente: v.cliente_nombre || 'Cliente',
            telefono: v.cliente_telefono || v.telefono || '',
            vendedor: v.vendedor || 'Samir',
            version: it.modelo === 'Nuevo' ? 'Versión 2 (Nueva)' : 'Versión 1 (Clásica)',
            versionCorta: it.modelo === 'Nuevo' ? 'v2' : 'v1',
            genero: it.genero || 'Hombre',
            color: it.color || 'Negro',
            talla: it.talla || 'M',
            bordado: (it.programa || '').trim(),
            estado: 'Pedido',
            precio,
            costo,
            abono: abonoItem,
            saldo: saldoItem,
            lugarEntrega: v.lugar_entrega || '',
            fechaEntrega: v.fecha_entrega || 'Por definir',
            nota: v.nota || ''
          });
        }
      });
    } else {
      // Pedido simple antiguo
      const est = normalizarEstado(v.estado);
      if (est === 'Pedido') {
        const precio = Number(v.precio_unitario) || 39000;
        const costo = Number(v.costo_unitario) || 30000;
        const abonoItem = Number(v.abono) || 0;

        for (let i = 0; i < cant; i++) {
          totalCostoCompra += costo;
          totalVentaCompra += precio;

          prendasPorComprar.push({
            pedidoId: v.id,
            itemIdx: i + 1,
            cliente: v.cliente_nombre || 'Cliente',
            telefono: v.cliente_telefono || v.telefono || '',
            vendedor: v.vendedor || 'Samir',
            version: v.modelo === 'Nuevo' ? 'Versión 2 (Nueva)' : 'Versión 1 (Clásica)',
            versionCorta: v.modelo === 'Nuevo' ? 'v2' : 'v1',
            genero: v.genero || 'Hombre',
            color: v.color || 'Negro',
            talla: v.talla || 'M',
            bordado: (v.cliente_programa || '').trim(),
            estado: 'Pedido',
            precio,
            costo,
            abono: i === 0 ? abonoItem : 0,
            saldo: i === 0 ? Math.max(precio * cant - abonoItem, 0) : 0,
            lugarEntrega: v.lugar_entrega || '',
            fechaEntrega: v.fecha_entrega || 'Por definir',
            nota: v.nota || ''
          });
        }
      }
    }
  });

  if (prendasPorComprar.length === 0) {
    throw new Error('✅ No hay pedidos con camisas en estado "Pedido" pendientes por comprar.');
  }

  // 3. Consolidar lista de compra agrupada (para taller)
  const consolidadoMap = {};
  prendasPorComprar.forEach(p => {
    const key = `${p.version}|${p.genero}|${p.color}|${p.talla}|${p.bordado}`;
    if (!consolidadoMap[key]) {
      consolidadoMap[key] = {
        cantidad: 0,
        version: p.version,
        genero: p.genero,
        color: p.color,
        talla: p.talla,
        bordado: p.bordado || 'Sin bordado'
      };
    }
    consolidadoMap[key].cantidad += 1;
  });

  const consolidadoFilas = Object.values(consolidadoMap).sort((a, b) =>
    a.version.localeCompare(b.version) ||
    a.genero.localeCompare(b.genero) ||
    a.color.localeCompare(b.color) ||
    a.talla.localeCompare(b.talla)
  );

  // 4. Crear libro de trabajo en ExcelJS
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Camisas IUB';
  wb.created = new Date();

  // ==========================================
  // HOJA 1: LISTA DE COMPRA (CONSOLIDADA TALLER)
  // ==========================================
  const ws1 = wb.addWorksheet('Lista de Compra');
  ws1.views = [{ state: 'frozen', ySplit: 1 }];

  const h1 = ['Cantidad', 'Versión Polo', 'Género', 'Color', 'Talla', 'Bordado / Programa'];
  const rowH1 = ws1.addRow(h1);
  styleHeader(rowH1);

  consolidadoFilas.forEach((c, idx) => {
    const r = ws1.addRow([
      c.cantidad,
      c.version,
      c.genero,
      c.color,
      c.talla,
      c.bordado
    ]);
    r.height = 20;
    const zebra = idx % 2 === 0 ? EXCEL_THEME.zebraA : EXCEL_THEME.zebraB;
    r.eachCell((cell, colNum) => {
      cell.fill = zebra;
      cell.font = colNum === 1 ? EXCEL_THEME.boldBodyFont : EXCEL_THEME.bodyFont;
      cell.border = EXCEL_THEME.thinBorder;
      cell.alignment = {
        horizontal: colNum === 1 || colNum === 5 ? 'center' : 'left',
        vertical: 'middle'
      };
    });
  });

  // Habilitar AutoFilter en toda la tabla para filtrar por cualquier columna
  ws1.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: consolidadoFilas.length + 1, column: h1.length }
  };
  autoFitColumns(ws1, 14);

  // ==========================================
  // HOJA 2: DETALLE POR PRENDA (ESTADO: PEDIDO)
  // ==========================================
  const ws2 = wb.addWorksheet('Detalle Prendas a Comprar');
  ws2.views = [{ state: 'frozen', ySplit: 1 }];

  const h2 = [
    'ID Pedido', 'Fecha Pedido', 'Cliente', 'Teléfono', 'Vendedor',
    'Versión', 'Género', 'Color', 'Talla', 'Bordado',
    'Estado', 'Precio Venta', 'Costo Yesenia', 'Abono Cliente', 'Saldo Pendiente',
    'Lugar Entrega', 'Fecha Entrega', 'Nota'
  ];
  const rowH2 = ws2.addRow(h2);
  styleHeader(rowH2);

  const MONEY_COLS_2 = new Set([12, 13, 14, 15]);
  const CENTER_COLS_2 = new Set([1, 2, 5, 6, 7, 9, 11, 17]);

  prendasPorComprar.forEach((p, idx) => {
    const r = ws2.addRow([
      `#${p.pedidoId}`,
      p.pedidoId ? (dataset.find(v => v.id === p.pedidoId)?.fecha || '') : '',
      p.cliente,
      p.telefono,
      p.vendedor,
      p.versionCorta.toUpperCase(),
      p.genero,
      p.color,
      p.talla,
      p.bordado || 'Sin bordado',
      p.estado,
      p.precio,
      p.costo,
      p.abono,
      p.saldo,
      p.lugarEntrega,
      p.fechaEntrega,
      p.nota
    ]);
    r.height = 20;
    const zebra = idx % 2 === 0 ? EXCEL_THEME.zebraA : EXCEL_THEME.zebraB;

    r.eachCell((cell, colNum) => {
      cell.fill = zebra;
      cell.font = EXCEL_THEME.bodyFont;
      cell.border = EXCEL_THEME.thinBorder;

      if (MONEY_COLS_2.has(colNum)) {
        cell.numFmt = EXCEL_THEME.moneyFormat;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (CENTER_COLS_2.has(colNum)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Estilo chip de estado
      if (colNum === 11) {
        cell.fill = ESTADOS_EXCEL['Pedido'].fill;
        cell.font = ESTADOS_EXCEL['Pedido'].font;
      }
    });
  });

  // Habilitar AutoFilter en toda la tabla
  ws2.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: prendasPorComprar.length + 1, column: h2.length }
  };
  autoFitColumns(ws2, 13);

  // ==========================================
  // HOJA 3: RESUMEN DE LA COMPRA
  // ==========================================
  const ws3 = wb.addWorksheet('Resumen de Compra');
  ws3.views = [{ state: 'frozen', ySplit: 1 }];

  const pedidosUnicos = new Set(prendasPorComprar.map(p => p.pedidoId)).size;
  const gananciaEst = Math.max(totalVentaCompra - totalCostoCompra, 0);

  const resumenDatos = [
    ['METRICA', 'VALOR'],
    ['Fecha de Exportación', formatearFechaHumana(hoyColombia())],
    ['Pedidos con prendas por comprar', pedidosUnicos],
    ['Total de Camisas por comprar al taller', prendasPorComprar.length],
    ['Costo Total Estimado a pagar a Yesenia', totalCostoCompra],
    ['Valor Venta Total proyectado', totalVentaCompra],
    ['Ganancia Total Estimada', gananciaEst],
    ['Ganancia Samir (50%)', Math.round(gananciaEst / 2)],
    ['Ganancia Valentina (50%)', Math.round(gananciaEst / 2)]
  ];

  resumenDatos.forEach((fila, idx) => {
    const r = ws3.addRow(fila);
    r.height = idx === 0 ? 24 : 22;

    if (idx === 0) {
      styleHeader(r);
    } else {
      const zebra = idx % 2 === 0 ? EXCEL_THEME.zebraA : EXCEL_THEME.zebraB;
      r.eachCell((cell, colNum) => {
        cell.fill = zebra;
        cell.border = EXCEL_THEME.thinBorder;
        if (colNum === 1) {
          cell.font = EXCEL_THEME.boldBodyFont;
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.font = EXCEL_THEME.bodyFont;
          cell.alignment = { horizontal: typeof cell.value === 'number' ? 'right' : 'left', vertical: 'middle' };
          if (idx >= 4 && typeof cell.value === 'number') {
            cell.numFmt = EXCEL_THEME.moneyFormat;
            cell.font = EXCEL_THEME.boldBodyFont;
          }
        }
      });
    }
  });

  ws3.autoFilter = { from: { row: 1, column: 1 }, to: { row: resumenDatos.length, column: 2 } };
  autoFitColumns(ws3, 24);

  // 5. Descargar archivo
  const fechaHoy = hoyColombia();
  await descargarWorkbook(wb, `Compra_Camisas_IUB_${fechaHoy}.xlsx`);
}

/**
 * EXPORTAR REPORTE COMPLETO DE VENTAS CON TABLA Y FILTROS
 * Usado en ReportsView con diseño real y AutoFilter en todas las columnas
 */
export async function exportarReporteCompletoExcel(ventas, filtroTipo = 'todos') {
  const dataset = (ventas || []).filter(v => {
    if (filtroTipo === 'activos') return !v.finalizado && v.estado !== 'Liquidado';
    if (filtroTipo === 'historial') return v.finalizado || v.estado === 'Liquidado';
    return true;
  });

  if (dataset.length === 0) {
    throw new Error('No hay pedidos registrados para exportar con el filtro seleccionado.');
  }

  const filas = [];
  dataset.forEach(v => {
    const items = itemsCrudosVenta(v) || [];
    const cant = Number(v.cantidad) || 1;

    let diaSemana = '';
    if (v.fecha_entrega) {
      try {
        const d = new Date(v.fecha_entrega + 'T12:00:00');
        diaSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()] || '';
      } catch {}
    }

    if (items.length > 0) {
      items.forEach((it, idx) => {
        const precio = precioDeItem(it, v);
        const costo = costoDeItem(it, v);
        const abonoItem = Number(it.abono) || 0;
        const saldoItem = Math.max(precio - abonoItem, 0);
        const gananciaItem = Math.max(precio - costo, 0);
        const estPrenda = normalizarEstado(it.estado || v.estado);

        filas.push({
          pedidoId: v.id,
          fechaPedido: v.fecha || '',
          fechaEntrega: v.fecha_entrega || 'Por definir',
          diaSemana,
          cliente: v.cliente_nombre || 'Cliente',
          telefono: v.cliente_telefono || v.telefono || '',
          vendedor: v.vendedor || 'Samir',
          estadoPedido: v.estado || 'Pedido',
          lugarEntrega: v.lugar_entrega || '',
          version: it.modelo === 'Nuevo' ? 'Versión 2' : 'Versión 1',
          genero: it.genero || 'Hombre',
          color: it.color || 'Negro',
          talla: it.talla || 'M',
          bordado: it.programa || 'Sin bordado',
          estadoPrenda: estPrenda,
          precio,
          costo,
          abono: abonoItem,
          saldo: saldoItem,
          ganancia: gananciaItem,
          nota: v.nota || ''
        });
      });
    } else {
      const precio = Number(v.precio_unitario) || 39000;
      const costo = Number(v.costo_unitario) || 30000;
      const abonoTotal = Number(v.abono) || 0;
      const saldoTotal = Math.max(precio * cant - abonoTotal, 0);
      const gananciaTotal = Math.max(precio * cant - costo * cant, 0);

      filas.push({
        pedidoId: v.id,
        fechaPedido: v.fecha || '',
        fechaEntrega: v.fecha_entrega || 'Por definir',
        diaSemana,
        cliente: v.cliente_nombre || 'Cliente',
        telefono: v.cliente_telefono || v.telefono || '',
        vendedor: v.vendedor || 'Samir',
        estadoPedido: v.estado || 'Pedido',
        lugarEntrega: v.lugar_entrega || '',
        version: v.modelo === 'Nuevo' ? 'Versión 2' : 'Versión 1',
        genero: v.genero || 'Hombre',
        color: v.color || 'Negro',
        talla: v.talla || 'M',
        bordado: v.cliente_programa || 'Sin bordado',
        estadoPrenda: normalizarEstado(v.estado),
        precio: precio * cant,
        costo: costo * cant,
        abono: abonoTotal,
        saldo: saldoTotal,
        ganancia: gananciaTotal,
        nota: v.nota || ''
      });
    }
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Camisas IUB';
  wb.created = new Date();

  // Hoja 1: Reporte Completo
  const ws = wb.addWorksheet('Reporte de Ventas');
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const headers = [
    'ID Pedido', 'Fecha Pedido', 'Fecha Entrega', 'Día Entrega', 'Cliente',
    'Teléfono', 'Vendedor', 'Estado Pedido', 'Lugar Entrega', 'Versión',
    'Género', 'Color', 'Talla', 'Bordado', 'Estado Prenda',
    'Precio ($)', 'Costo ($)', 'Abono ($)', 'Saldo ($)', 'Ganancia ($)', 'Nota'
  ];

  const rowH = ws.addRow(headers);
  styleHeader(rowH);

  const MONEY_COLS = new Set([16, 17, 18, 19, 20]);
  const CENTER_COLS = new Set([1, 2, 3, 4, 7, 8, 10, 11, 13, 15]);

  filas.forEach((f, idx) => {
    const r = ws.addRow([
      `#${f.pedidoId}`,
      f.fechaPedido,
      f.fechaEntrega,
      f.diaSemana,
      f.cliente,
      f.telefono,
      f.vendedor,
      f.estadoPedido,
      f.lugarEntrega,
      f.version,
      f.genero,
      f.color,
      f.talla,
      f.bordado,
      f.estadoPrenda,
      f.precio,
      f.costo,
      f.abono,
      f.saldo,
      f.ganancia,
      f.nota
    ]);
    r.height = 20;
    const zebra = idx % 2 === 0 ? EXCEL_THEME.zebraA : EXCEL_THEME.zebraB;

    r.eachCell((cell, colNum) => {
      cell.fill = zebra;
      cell.font = EXCEL_THEME.bodyFont;
      cell.border = EXCEL_THEME.thinBorder;

      if (MONEY_COLS.has(colNum)) {
        cell.numFmt = EXCEL_THEME.moneyFormat;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (CENTER_COLS.has(colNum)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Estilizar estados con chip de color
      if (colNum === 8 || colNum === 15) {
        const estColor = ESTADOS_EXCEL[cell.value] || ESTADOS_EXCEL['Pedido'];
        cell.fill = estColor.fill;
        cell.font = estColor.font;
      }
    });
  });

  // Habilitar AutoFilter en toda la cabecera para poder filtrar por columna
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: filas.length + 1, column: headers.length }
  };
  autoFitColumns(ws, 12);

  // Descargar archivo
  await descargarWorkbook(wb, `Reporte_Camisas_IUB_${hoyColombia()}.xlsx`);
}
