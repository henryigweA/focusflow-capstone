docker run -d \
  --name focusflow-db-local \
  -e POSTGRES_USER=focus_user \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=focusflow \
  -p 5432:5432 \
  postgres:16             CREATED A POSTGRES CONTAINER & RUNNING IMAGE TO ACTUALLY STORE THE TABLE IN USING THE SAME CRED IN .ENV FILE

  docker ps               SHOW ALL THE  CONTAINERS ON OUR DOCKER MACHINE

  docker exec -i focusflow-db-local psql -U focus_user -d focusflow < database/init.sql  RUN THE CODE IN THE FILE TO CREATE A TABLE IN THE CONTAINER & INSERT SOME DATA.

  docker exec -it focusflow-db-local psql -U focus_user -d focusflow -c "\dt"   LISTED OUT ALL THE TABLES CREATED IN THE CONTAINER.

  docker exec -it focusflow-db-local psql -U focus_user -d focusflow -c "SELECT * FROM focus_sessions;"    SHOW ALL THE DATE IN A PARTICULAR TABLE FROM A CONTAINER.

cd backend
cp .env.example .env
npm install
npm start     CREATE .ENV FILE,INSTALL ALL DEPENDENCIES AND START THE SERVER

docker stop focusflow-db-local
curl http://localhost:5000/health
docker start focusflow-db-local
curl http://localhost:5000/api/sessions
curl http://localhost:5000/api/sessions/stats
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"task":"Test the backend","category":"DevOps","duration":30,"mood":"Curious"}'               CONFIRM THE SUCCESFFUL CONNECTION AND MADE A GET all GET ANd POST request

app.use('/api/sessions', sessionsRouter);   ANY REQUEST LIKE curl http://localhost:5000/api/sessions SHOULD GO TO sessionsRouter(a variable that goes to) THE FOLDER routers/sessions(prefixes) for other contents in the sessions.js file 

create Dockerfile at the backend root and ran docker build -t focusflow-backend:test .       (likely broke due to network issues so try pulling the image continuously first till it completely installs eg docker pull node:20-alpine before running docker build -t focusflow-backend:test .  again)

docker network create focusflow-net   CREATE A NETWORK SO THE BACKEND AND POSTGRES CONTAINERS CAN COMMUNICATE WITH EACH OTHER ORDER THAN YOUR LOCAL IP.

docker network connect focusflow-net focusflow-db-local  CONNECTS THE  POSTGRES CONTAINER TO THE DOCKER CREATED NETWORK

docker run -d \
  --name focusflow-backend-test \
  --network focusflow-net \
  -p 5000:5000 \
  -e DB_HOST=focusflow-db-local \
  -e DB_PORT=5432 \
  -e DB_NAME=focusflow \
  -e DB_USER=focus_user \
  -e DB_PASSWORD=changeme \
  -e PORT=5000 \
  focusflow-backend:test    CREATED THE BACKEND CONTAINER AND JOINED WITH THE CREATED NETWORK AND SAME USER,NAME AND PASSWORD(LIKE SAME CREDENTIALS FOR ALL CONTAINERS RUNNING UNDER THIS PROJECT) FROM .ENV SO BOTH CONTAINERS CAN COMMUNINCATES WITH THEI OWN PORT.

  curl http://localhost:5000/health  CHECK IF THE BOTH CONTAINERS ARE RESPONDING(POOL.QUERY.. USES THE .ENV DB.JS CONFIGURATIONS TO MAKE A )

create Dockerfile and ngix.conf file for fronend  WE NEED TO BUILD THE NODE VITE IMAGE AND THEN THE NGIX IMAGE WHICH WILL COPY THE DIRT FOLDER FROM NOTE VITE AND DISPOSE ITSELF.

THEN ADDED THE FRONTEND SERVICE AS THE THIRD SERVICE IN THE DOCKER COMPOSE FILE

docker compose up --build   THEN REBUILD EVERYTHING   (somethings might not build because RUN npm install at the db docker file must be installed in docker other wise use RUN npm ci)

tested the app using localhost:8000 (if the frontend and backend images is not runningthe site wount show and if the backend image is not running the logs wont show or record requests)

next we make use of docker hub to store our built images so it can be pulled by other machines like linux VM for free rather than using azure acr registtras.(prefared by startups tho)