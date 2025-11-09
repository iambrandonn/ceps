import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { FactExtractor } from '../../src/parser/fact-extractor.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { ExpressRouterPattern } from '../../src/reasoning/patterns/express/router.js';

describe('Express Router with Default Export', () => {
  it('should detect and document exported router', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'routes.js',
      `
      import express from 'express';
      const router = express.Router();

      router.get('/users', (req, res) => {
        res.json({ users: [] });
      });

      export default router;
      `
    );

    // Extract entities
    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'routes.js');

    // Verify router is marked as exported
    const routerEntity = result.entities.find((e) => e.name === 'router');
    expect(routerEntity).toBeDefined();
    expect(routerEntity?.exported).toBe(true);
    expect(routerEntity?.visibility).toBe('public');

    // Verify Express pattern matches
    const kb = new KnowledgeBase();
    result.entities.forEach((e) => kb.insertEntity(e));
    result.factSets.forEach((fs) => kb.insertFactSet(fs));

    const pattern = new ExpressRouterPattern();
    expect(pattern.matches(kb, routerEntity!)).toBe(true);

    const chunks = pattern.describe(kb, routerEntity!);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].textDraft).toContain('Express Router');
    expect(chunks[0].textDraft).toContain('GET /users');

    // Verify the is-default-export fact was added (Issue 4 from code review)
    const routerFactSet = result.factSets.find((fs) => fs.id === `${routerEntity!.id}-facts`);
    expect(routerFactSet).toBeDefined();
    const defaultExportFact = routerFactSet?.facts.find((f) => f.predicate === 'is-default-export');
    expect(defaultExportFact).toBeDefined();
    expect(defaultExportFact?.object).toBe(true);
  });

  it('should handle multiple routes on default exported router', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'api-routes.js',
      `
      import { Router } from 'express';
      const apiRouter = Router();

      apiRouter.get('/status', (req, res) => {
        res.json({ status: 'ok' });
      });

      apiRouter.post('/users', (req, res) => {
        res.json({ created: true });
      });

      apiRouter.delete('/users/:id', (req, res) => {
        res.json({ deleted: true });
      });

      export default apiRouter;
      `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'api-routes.js');

    const routerEntity = result.entities.find((e) => e.name === 'apiRouter');
    expect(routerEntity).toBeDefined();
    expect(routerEntity?.exported).toBe(true);

    // Verify Express pattern detects all routes
    const kb = new KnowledgeBase();
    result.entities.forEach((e) => kb.insertEntity(e));
    result.factSets.forEach((fs) => kb.insertFactSet(fs));

    const pattern = new ExpressRouterPattern();
    const chunks = pattern.describe(kb, routerEntity!);

    expect(chunks[0].textDraft).toContain('GET /status');
    expect(chunks[0].textDraft).toContain('POST /users');
    expect(chunks[0].textDraft).toContain('DELETE /users/:id');
  });

  it('should handle named exports alongside default export', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'routes.js',
      `
      import express from 'express';
      const router = express.Router();
      const middleware = (req, res, next) => next();

      router.get('/data', middleware, (req, res) => {
        res.json({ data: [] });
      });

      export { middleware };
      export default router;
      `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'routes.js');

    const routerEntity = result.entities.find((e) => e.name === 'router');
    const middlewareEntity = result.entities.find((e) => e.name === 'middleware');

    expect(routerEntity?.exported).toBe(true);
    expect(routerEntity?.visibility).toBe('public');
    expect(middlewareEntity?.exported).toBe(true);
    expect(middlewareEntity?.visibility).toBe('public');

    // Verify default export fact is only on router
    const routerFactSet = result.factSets.find((fs) => fs.id === `${routerEntity!.id}-facts`);
    const middlewareFactSet = result.factSets.find((fs) => fs.id === `${middlewareEntity!.id}-facts`);

    const routerDefaultFact = routerFactSet?.facts.find((f) => f.predicate === 'is-default-export');
    const middlewareDefaultFact = middlewareFactSet?.facts.find((f) => f.predicate === 'is-default-export');

    expect(routerDefaultFact).toBeDefined();
    expect(middlewareDefaultFact).toBeUndefined();
  });
});
